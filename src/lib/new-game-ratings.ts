import "server-only";
import type { OneTimeGameRatings } from "@/lib/data/types";
import {
  emptyRatings, normalizedGameTitle, platformNamesInRawg, selectHltbMainStory,
  selectRawgGame, selectRawgMetascore,
} from "@/lib/game-ratings.logic";

type HltbRecord = { id?: string | number; name?: string; gameplayMain?: number };
const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => {
    // A bounded server-side wait; late upstream completions cannot change the stored record.
    const timer = setTimeout(() => reject(new Error("External ratings timeout")), ms);
    timer.unref?.();
    void promise.finally(() => clearTimeout(timer)).catch(() => undefined);
  })]);

async function getHltb(title: string): Promise<OneTimeGameRatings["hltb"]> {
  // Only invoked during a new collection add, never during a page render.
  const { HowLongToBeatService } = await import("howlongtobeat");
  const items = await timeout(new HowLongToBeatService().search(title) as Promise<HltbRecord[]>, 6000);
  return selectHltbMainStory(title, Array.isArray(items) ? items : []);
}

async function rawgJson(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`RAWG HTTP ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function getMetacritic(title: string, platform: string): Promise<OneTimeGameRatings["metacritic"]> {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey || !platformNamesInRawg(platform).length) {
    return { score: null, url: null, rawgUrl: null, status: "unavailable" };
  }
  // Shared timeout across search + details, rather than 5.5 s for each request.
  const signal = AbortSignal.timeout(6000);
  const query = new URLSearchParams({ key: apiKey, search: title, page_size: "40", search_exact: "true", search_precise: "true" });
  const payload = await rawgJson(`https://api.rawg.io/api/games?${query}`, signal);
  const results = Array.isArray(payload.results) ? payload.results : [];
  const selected = selectRawgGame(title, platform, results);
  if (!selected?.id) return { score: null, url: null, rawgUrl: null, status: "unmatched" };
  const detail = await rawgJson(`https://api.rawg.io/api/games/${selected.id}?${new URLSearchParams({ key: apiKey })}`, signal);
  if (!detail || normalizedGameTitle(String(detail.name ?? "")) !== normalizedGameTitle(title)) {
    return { score: null, url: null, rawgUrl: null, status: "unmatched" };
  }
  return selectRawgMetascore(platform, detail);
}

/** Best-effort and one-shot: provider outages do not block a user's add action. */
export async function collectNewGameRatings(title: string, platform: string): Promise<OneTimeGameRatings> {
  const result = emptyRatings(new Date().toISOString());
  const [hltb, metacritic] = await Promise.allSettled([getHltb(title), getMetacritic(title, platform)]);
  if (hltb.status === "fulfilled") result.hltb = hltb.value;
  else console.warn("hltb_on_add_unavailable", { errorName: hltb.reason instanceof Error ? hltb.reason.name : "Unknown" });
  if (metacritic.status === "fulfilled") result.metacritic = metacritic.value;
  else console.warn("rawg_on_add_unavailable", { errorName: metacritic.reason instanceof Error ? metacritic.reason.name : "Unknown" });
  return result;
}
