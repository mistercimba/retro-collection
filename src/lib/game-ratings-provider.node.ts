import type { OneTimeGameRatings } from "./data/types";
import {
  conservativeSearchTitles, emptyRatings, normalizedGameTitle, platformNamesInRawg, selectHltbMainStory,
  selectRawgGame, selectRawgMetascore,
} from "./game-ratings.logic";

type HltbRecord = { id?: string | number; name?: string; gameplayMain?: number };
type ModernHltbEntry = { id: number|string; name: string; mainTime: number };
export class RatingsProviderFailure extends Error {
  constructor(public readonly source:"hltb"|"rawg", public readonly reason:"timeout"|"http"|"network"|"provider", public readonly httpStatus?:number) {
    super(`${source === "hltb" ? "HowLongToBeat" : "RAWG"} indisponível (${reason}${httpStatus ? " " + httpStatus : ""}). A atualização foi interrompida; nenhum resultado vazio foi guardado neste jogo.`);
    this.name = "RatingsProviderFailure";
  }
}
function classifyProviderFailure(source:"hltb"|"rawg", error:unknown):RatingsProviderFailure {
  const failure = error && typeof error === "object" ? error as Record<string,unknown> : {};
  const httpStatus = typeof failure.status === "number" && failure.status >= 400 && failure.status <= 599
    ? failure.status : undefined;
  const text = error instanceof Error ? error.message : "";
  const reason = failure.name === "TimeoutError" || /timeout|timed out/i.test(text) ? "timeout" :
    httpStatus || /http \d{3}/i.test(text) ? "http" :
    /fetch|connect|network|ENOTFOUND|ECONN|EAI_/i.test(text) ? "network" : "provider";
  return new RatingsProviderFailure(source, reason, httpStatus);
}
export type BeforeExternalRequest = () => Promise<void>;
export type RatingsLookupOptions = {
  hltb?: boolean;
  metacritic?: boolean;
  beforeExternalRequest?: BeforeExternalRequest;
  /** Bulk maintenance must stop immediately on a provider error. */
  strict?: boolean;
};
const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => {
    // A bounded server-side wait; late upstream completions cannot change the stored record.
    const timer = setTimeout(() => reject(new Error("External ratings timeout")), ms);
    timer.unref?.();
    void promise.finally(() => clearTimeout(timer)).catch(() => undefined);
  })]);

async function getHltb(title: string, beforeExternalRequest?: BeforeExternalRequest): Promise<OneTimeGameRatings["hltb"]> {
  // Old howlongtobeat@1.8.0 used an endpoint that no longer works, confirmed
  // by production logs. The maintained TS client uses the current search flow.
  const { HowLongToBeatService, toHours } = await import("howlongtobeat-ts");
  await beforeExternalRequest?.();
  const result = await new HowLongToBeatService({
    timeout: 7500, retries: 0, minSimilarity: 0.3,
  }).search(title);
  if (!result.success) {
    throw new RatingsProviderFailure("hltb",
      result.kind === "timeout" ? "timeout" :
      result.kind === "http" ? "http" :
      result.kind === "transport" ? "network" : "provider", result.status);
  }
  const entries = result.data.map((item: ModernHltbEntry) => ({
    id: item.id, name: item.name, gameplayMain: toHours(item.mainTime),
  }));
  const titleOptions = conservativeSearchTitles(title, "");
  return selectHltbMainStory(titleOptions[0], entries);
}
async function rawgJson(url: string, signal: AbortSignal, beforeExternalRequest?: BeforeExternalRequest) {
  await beforeExternalRequest?.();
  // In maintenance mode the 2–3 s rate-limit pause must NOT use up the HTTP
  // timeout. Give each actual RAWG request its own 6 s deadline.
  const requestSignal = beforeExternalRequest ? AbortSignal.timeout(6000) : signal;
  const response = await fetch(url, { signal: requestSignal, cache: "no-store" });
  if (!response.ok) throw new Error(`RAWG HTTP ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function getMetacritic(title: string, platform: string, beforeExternalRequest?: BeforeExternalRequest): Promise<OneTimeGameRatings["metacritic"]> {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) throw new RatingsProviderFailure("rawg", "provider");
  if (!platformNamesInRawg(platform).length) return { score: null, url: null, rawgUrl: null, status: "unavailable" };
  // Shared timeout across search + details, rather than 5.5 s for each request.
  const signal = AbortSignal.timeout(6000);
  // Only retry names with a tightly scoped, platform-specific edition suffix.
  // Search and optional detail fetch are paced separately.
  const titles = conservativeSearchTitles(title, platform);
  let candidate: ReturnType<typeof selectRawgGame> = null;
  for (const searchTitle of titles) {
    const query = new URLSearchParams({ key: apiKey, search: searchTitle, page_size: "40", search_exact: "true", search_precise: "true" });
    const payload = await rawgJson(`https://api.rawg.io/api/games?${query}`, signal, beforeExternalRequest);
    const results = Array.isArray(payload.results) ? payload.results : [];
    candidate = selectRawgGame(title, platform, results);
    if (candidate) break;
  }
  if (!candidate?.id) return { score: null, url: null, rawgUrl: null, status: "unmatched" };
  const detail = await rawgJson(`https://api.rawg.io/api/games/${candidate.id}?${new URLSearchParams({ key: apiKey })}`, signal, beforeExternalRequest);
  const options = conservativeSearchTitles(title, platform);
  if (!detail || !options.some(name=>normalizedGameTitle(name).replace(/(?:^| )version$/,"") ===
    normalizedGameTitle(String(detail.name ?? "")).replace(/(?:^| )version$/,""))) {
    return { score: null, url: null, rawgUrl: null, status: "unmatched" };
  }
  return selectRawgMetascore(platform, detail);
}


/**
 * Shared Node provider used by normal server actions and the CLI.
 * Maintenance mode is sequential and calls its pacer before EVERY RAWG fetch
 * and HLTB search. Normal app additions keep the existing concurrent behavior.
 */
export async function collectNewGameRatings(
  title: string, platform: string, options: RatingsLookupOptions = {},
): Promise<OneTimeGameRatings> {
  const result = emptyRatings(new Date().toISOString());
  const hltb = async () => {
    if (options.hltb === false) return;
    try { result.hltb = await getHltb(title, options.beforeExternalRequest); }
    catch (error) {
      const failure = error instanceof RatingsProviderFailure ? error : classifyProviderFailure("hltb", error);
      console.warn("hltb_lookup_failed", { reason: failure.reason, httpStatus: failure.httpStatus });
      if (options.strict) throw failure;
      result.hltb = { mainHours:null, gameId:null, status:"error" };
    }
  };
  const metacritic = async () => {
    if (options.metacritic === false) return;
    try { result.metacritic = await getMetacritic(title, platform, options.beforeExternalRequest); }
    catch (error) {
      const failure = error instanceof RatingsProviderFailure ? error : classifyProviderFailure("rawg", error);
      console.warn("rawg_lookup_failed", { reason:failure.reason, httpStatus:failure.httpStatus });
      if (options.strict) throw failure;
      result.metacritic = { score:null, url:null, rawgUrl:null, status:"error" };
    }
  };
  if (options.beforeExternalRequest) {
    await hltb();
    await metacritic();
  } else {
    await Promise.all([hltb(), metacritic()]);
  }
  return result;
}
