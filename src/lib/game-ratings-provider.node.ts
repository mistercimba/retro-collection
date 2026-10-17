import type { OneTimeGameRatings } from "./data/types";
import {
  emptyRatings, normalizedGameTitle, platformNamesInRawg, selectHltbMainStory,
  selectRawgGame, selectRawgMetascore,
} from "./game-ratings.logic";

type HltbRecord = { id?: string | number; name?: string; gameplayMain?: number };
export type BeforeExternalRequest = () => Promise<void>;
export type RatingsLookupOptions = {
  hltb?: boolean;
  metacritic?: boolean;
  beforeExternalRequest?: BeforeExternalRequest;
};
const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => {
    // A bounded server-side wait; late upstream completions cannot change the stored record.
    const timer = setTimeout(() => reject(new Error("External ratings timeout")), ms);
    timer.unref?.();
    void promise.finally(() => clearTimeout(timer)).catch(() => undefined);
  })]);

async function getHltb(title: string, beforeExternalRequest?: BeforeExternalRequest): Promise<OneTimeGameRatings["hltb"]> {
  // Only invoked during a new collection add, never during a page render.
  const { HowLongToBeatService } = await import("howlongtobeat");
  await beforeExternalRequest?.();
  const items = await timeout(new HowLongToBeatService().search(title) as Promise<HltbRecord[]>, 6000);
  return selectHltbMainStory(title, Array.isArray(items) ? items : []);
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
  if (!apiKey || !platformNamesInRawg(platform).length) {
    return { score: null, url: null, rawgUrl: null, status: "unavailable" };
  }
  // Shared timeout across search + details, rather than 5.5 s for each request.
  const signal = AbortSignal.timeout(6000);
  const query = new URLSearchParams({ key: apiKey, search: title, page_size: "40", search_exact: "true", search_precise: "true" });
  const payload = await rawgJson(`https://api.rawg.io/api/games?${query}`, signal, beforeExternalRequest);
  const results = Array.isArray(payload.results) ? payload.results : [];
  const selected = selectRawgGame(title, platform, results);
  if (!selected?.id) return { score: null, url: null, rawgUrl: null, status: "unmatched" };
  const detail = await rawgJson(`https://api.rawg.io/api/games/${selected.id}?${new URLSearchParams({ key: apiKey })}`, signal, beforeExternalRequest);
  if (!detail || normalizedGameTitle(String(detail.name ?? "")) !== normalizedGameTitle(title)) {
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
    catch (error) { console.warn("hltb_lookup_unavailable", { errorName: error instanceof Error ? error.name : "Unknown" }); }
  };
  const metacritic = async () => {
    if (options.metacritic === false) return;
    try { result.metacritic = await getMetacritic(title, platform, options.beforeExternalRequest); }
    catch (error) { console.warn("rawg_lookup_unavailable", { errorName: error instanceof Error ? error.name : "Unknown" }); }
  };
  if (options.beforeExternalRequest) {
    await hltb();
    await metacritic();
  } else {
    await Promise.all([hltb(), metacritic()]);
  }
  return result;
}
