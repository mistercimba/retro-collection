import type { OneTimeGameRatings, RatingsStatus } from "@/lib/data/types";

type HltbEntry = { id?: string | number; name?: string; gameplayMain?: number };
type RawgPlatform = { platform?: { name?: string; id?: number } };
type RawgCandidate = { id?: number; name?: string; slug?: string; platforms?: RawgPlatform[] };
type RawgScoreEntry = { metascore?: number; url?: string; platform?: { name?: string } };
type RawgDetail = RawgCandidate & { metacritic?: number; metacritic_url?: string; metacritic_platforms?: RawgScoreEntry[] };

const RAWG_NAMES: Record<string, string[]> = {
  "Nintendo Wii": ["Wii"], "Nintendo Wii U": ["Wii U"], "Nintendo Switch": ["Nintendo Switch"],
  "Nintendo DS": ["Nintendo DS"], "Nintendo 3DS": ["Nintendo 3DS"], "GameCube": ["GameCube"],
  "Nintendo 64": ["Nintendo 64"], NES: ["NES"], SNES: ["SNES"],
  "Game Boy": ["Game Boy"], "Game Boy Color": ["Game Boy Color"], "GameBoy Advance": ["Game Boy Advance"],
  Playstation: ["PlayStation"], "Playstation 2": ["PlayStation 2"], "Playstation 3": ["PlayStation 3"],
  "Playstation 4": ["PlayStation 4"], "Playstation 5": ["PlayStation 5"], PSP: ["PSP"], PC: ["PC"],
};
export const platformNamesInRawg = (platform: string) => RAWG_NAMES[platform] ?? [];

export function normalizedGameTitle(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();
}
/** Variant suffixes are accepted only with the correct console. */
export function conservativeSearchTitles(title: string, platform: string): string[] {
  const alternatives = [title];
  const canonicalPlatform = platform === "Nintendo Wii" ? "Wii" :
    platform === "Nintendo Wii U" ? "Wii U" : "";
  if (canonicalPlatform) {
    const expression = new RegExp(":\\s*" + canonicalPlatform.replace(/[.*+?^${}()|[\\]\\]/g, "\\const exactTitle = (left: string, right: string) => Boolean(normalizedGameTitle(left)) &&
  normalizedGameTitle(left) === normalizedGameTitle(right);") + "\\s+Edition$", "i");
    const bare = title.replace(expression, "").trim();
    if (bare && bare !== title) alternatives.push(bare);
  }
  return alternatives;
}
const comparableTitle = (value: string) =>
  normalizedGameTitle(value).replace(/(?:^| )version$/, "").trim();
const exactTitle = (left: string, right: string) => Boolean(comparableTitle(left)) &&
  comparableTitle(left) === comparableTitle(right);
export const ratingScore = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100 ? value : null;
export const positiveMainHours = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 10000 ? value : null;

export function selectHltbMainStory(title: string, entries: HltbEntry[]): OneTimeGameRatings["hltb"] {
  const matches = entries.filter((entry) => typeof entry.name === "string" && exactTitle(entry.name, title));
  const ids = [...new Map(matches.filter((entry) => /^\d+$/.test(String(entry.id ?? "")))
    .map((entry) => [String(entry.id), entry])).values()];
  if (ids.length !== 1) return { mainHours: null, gameId: null, status: ids.length ? "ambiguous" : "unmatched" };
  const mainHours = positiveMainHours(ids[0].gameplayMain);
  return { mainHours, gameId: mainHours === null ? null : String(ids[0].id), status: mainHours === null ? "unmatched" : "matched" };
}

export function selectRawgGame(title: string, platform: string, candidates: RawgCandidate[]): RawgCandidate | null {
  const names = platformNamesInRawg(platform);
  const titleOptions = conservativeSearchTitles(title, platform);
  if (!names.length) return null;
  const matches = candidates.filter((entry) => entry.id && entry.name && titleOptions.some(option => exactTitle(entry.name!, option)) &&
    entry.platforms?.some((p) => names.includes(p.platform?.name ?? "")));
  const unique = [...new Map(matches.map((entry) => [entry.id, entry])).values()];
  return unique.length === 1 ? unique[0] : null;
}

function safeMetacriticUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["metacritic.com", "www.metacritic.com"].includes(url.hostname) ? url.toString() : null;
  } catch { return null; }
}
function rawgSourceUrl(slug: string | undefined): string | null {
  return typeof slug === "string" && /^[a-z0-9-]{1,140}$/.test(slug)
    ? `https://rawg.io/games/${slug}` : null;
}

export function selectRawgMetascore(platform: string, detail: RawgDetail): OneTimeGameRatings["metacritic"] {
  const names = platformNamesInRawg(platform);
  const onPlatform = (detail.metacritic_platforms ?? []).filter((item) =>
    names.includes(item.platform?.name ?? "") && ratingScore(item.metascore) !== null);
  const platformBelongsToGame = detail.platforms?.some((p) => names.includes(p.platform?.name ?? "")) ?? false;
  if (!platformBelongsToGame) return { score: null, url: null, rawgUrl: null, status: "unmatched" };
  const rawgUrl = rawgSourceUrl(detail.slug);
  if (onPlatform.length === 1) return {
    score: ratingScore(onPlatform[0].metascore),
    url: safeMetacriticUrl(onPlatform[0].url),
    rawgUrl,
    status: "matched",
  };
  // A platform-agnostic score is trustworthy only for a genuinely single-platform record.
  if (!onPlatform.length && detail.platforms?.length === 1 && ratingScore(detail.metacritic) !== null) {
    return { score: ratingScore(detail.metacritic), url: safeMetacriticUrl(detail.metacritic_url), rawgUrl, status: "matched" };
  }
  return { score: null, url: null, rawgUrl: null, status: onPlatform.length > 1 ? "ambiguous" : "unmatched" };
}

export function emptyRatings(at: string): OneTimeGameRatings {
  return {
    lookupVersion: 2,
    fetchedAt: at,
    hltb: { mainHours: null, gameId: null, status: "unavailable" },
    metacritic: { score: null, url: null, rawgUrl: null, status: "unavailable" },
  };
}
export function ratingsStatus(status: RatingsStatus | undefined): RatingsStatus {
  return status === "matched" || status === "unmatched" || status === "ambiguous" || status === "unavailable" || status === "error"
    ? status : "unavailable";
}
