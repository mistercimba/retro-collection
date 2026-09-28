import { normalizeMatchTitle } from "./external-game-data.logic";

export type RawgPlatformRef = { name?: string; platform?: string; slug?: string };
export type RawgSearchGame = {
  id: number;
  name: string;
  platforms?: { platform?: RawgPlatformRef }[];
};
export type RawgSearchMatch<T extends RawgSearchGame = RawgSearchGame> =
  | { status: "matched"; game: T }
  | { status: "ambiguous"; games: T[] }
  | { status: "unmatched"; reason: "no-title-match" | "title-platform-mismatch" };

function canonicalTitle(value: string): string {
  return normalizeMatchTitle(value).replaceAll(" ", "");
}

function sameCanonicalTitle(left: string, right: string): boolean {
  const key = canonicalTitle(left);
  return key.length > 0 && key === canonicalTitle(right);
}

function rawgPlatformName(platform: RawgPlatformRef | undefined): string {
  return platform?.name ?? platform?.platform ?? "";
}

export function selectRawgSearchGame<T extends RawgSearchGame>(
  title: string,
  platformNames: string[],
  results: T[],
): RawgSearchMatch<T> {
  const titleMatches = results.filter((game) => sameCanonicalTitle(title, game.name));
  const platformKeys = new Set(platformNames.map(normalizeMatchTitle));
  const platformMatches = titleMatches.filter((game) =>
    game.platforms?.some(({ platform }) => platformKeys.has(normalizeMatchTitle(rawgPlatformName(platform)))),
  );
  const unique = [...new Map(platformMatches.map((game) => [game.id, game])).values()];
  if (unique.length === 1) return { status: "matched", game: unique[0] };
  if (unique.length > 1) return { status: "ambiguous", games: unique };
  return { status: "unmatched", reason: titleMatches.length ? "title-platform-mismatch" : "no-title-match" };
}

export type RawgGameDetails = {
  metacritic?: number | null;
  metacritic_url?: string | null;
  metacritic_platforms?: { metascore?: number | null; url?: string | null; platform?: RawgPlatformRef }[] | null;
  platforms?: { platform?: RawgPlatformRef }[] | null;
};

export type RawgMetascore = { value: number; url: string } | null;

function validScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function selectRawgMetascore(
  detail: RawgGameDetails,
  platformNames: string[],
): RawgMetascore {
  const platformKeys = new Set(platformNames.map(normalizeMatchTitle));
  const matchingPlatformEntries = (detail.metacritic_platforms ?? []).filter(({ platform }) =>
    platformKeys.has(normalizeMatchTitle(rawgPlatformName(platform))),
  );
  if (matchingPlatformEntries.length === 1 && validScore(matchingPlatformEntries[0].metascore)) {
    return { value: matchingPlatformEntries[0].metascore, url: matchingPlatformEntries[0].url || detail.metacritic_url || "" };
  }
  if (matchingPlatformEntries.length > 1) return null;

  const detailPlatforms = new Set((detail.platforms ?? [])
    .map(({ platform }) => normalizeMatchTitle(rawgPlatformName(platform)))
    .filter(Boolean));
  const isSingleMatchingPlatform = detailPlatforms.size === 1 && [...detailPlatforms].every((name) => platformKeys.has(name));
  if (isSingleMatchingPlatform && validScore(detail.metacritic)) {
    return { value: detail.metacritic, url: detail.metacritic_url || "" };
  }
  return null;
}
