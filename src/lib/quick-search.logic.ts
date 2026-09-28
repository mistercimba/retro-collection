import { displayPlatform } from "./data/platforms";

export type QuickSearchableGame = {
  title: string;
  platform: string;
  collectionId: string;
  edition: string;
  region: string;
  overallStatus: string;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findQuickSearchMatches<T extends QuickSearchableGame>(games: T[], query: string): T[] {
  const normalizedQuery = normalizeSearch(query);
  if (normalizedQuery.length < 2) return [];
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return games.filter((game) => {
    const haystack = normalizeSearch(
      [game.title, game.platform, displayPlatform(game.platform), game.collectionId, game.edition, game.region, game.overallStatus].join(" "),
    );
    return tokens.every((token) => haystack.includes(token));
  });
}
