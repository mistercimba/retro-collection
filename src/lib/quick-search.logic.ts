import { displayPlatform } from "./data/platforms";

export type QuickSearchableGame = {
  title: string;
  platform: string;
  collectionId: string;
  edition: string;
  region: string;
  overallStatus: string;
  keepStatus: string;
  catalogArtwork: boolean;
  needsCompletion: boolean;
};

export type QuickSearchableWishlistItem = {
  title: string;
  platform: string;
  targetId: string;
  targetVersion: string;
  priority: string;
  artworkSrc?: string | null;
};

type QuickSearchGameInput = Omit<QuickSearchableGame, "catalogArtwork" | "needsCompletion"> & {
  catalogArtwork?: boolean;
  needsCompletion?: boolean;
  catalog?: { artwork?: { pathname?: string } | null };
};

export function toQuickSearchableGame(game: QuickSearchGameInput, needsCompletion = game.needsCompletion ?? false): QuickSearchableGame {
  return {
    title: game.title,
    platform: game.platform,
    collectionId: game.collectionId,
    edition: game.edition,
    region: game.region,
    overallStatus: game.overallStatus,
    keepStatus: game.keepStatus,
    catalogArtwork: Boolean(game.catalogArtwork || game.catalog?.artwork?.pathname),
    needsCompletion,
  };
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesTokens(value: string, query: string) {
  const normalizedQuery = normalizeSearch(query);
  if (normalizedQuery.length < 2) return false;
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const haystack = normalizeSearch(value);
  return tokens.every((token) => haystack.includes(token));
}

export function findQuickSearchMatches<T extends QuickSearchGameInput>(games: T[], query: string): T[] {
  return games.filter((game) => matchesTokens(
    [game.title, game.platform, displayPlatform(game.platform), game.collectionId, game.edition, game.region, game.overallStatus].join(" "),
    query,
  ));
}

export function findQuickSearchWishlistMatches<T extends QuickSearchableWishlistItem>(targets: T[], query: string): T[] {
  return targets.filter((target) => matchesTokens(
    [target.title, target.platform, displayPlatform(target.platform), target.targetId, target.targetVersion, target.priority, "wishlist"].join(" "),
    query,
  ));
}
