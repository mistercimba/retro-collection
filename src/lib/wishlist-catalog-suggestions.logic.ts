import type { CanonicalGameIdentity, LibraryData } from "./data/types";
import { igdbPlatformId } from "./igdb-catalog.logic";
import { normalizeMatchText } from "./data/wishlist-matching";
import { wishlistSuggestionIdentity } from "./wishlist-list-suggestions.logic";

export type IgdbDiscoveryGame = {
  id: number;
  name: string;
  collections?: number[];
  platforms?: number[];
  game_type?: number | null;
  version_parent?: number | null;
  total_rating?: number | null;
  total_rating_count?: number | null;
  first_release_date?: number | null;
  cover?: { image_id?: string };
};

export type IgdbDiscoveryCollection = {
  id: number;
  name: string;
  games?: number[];
};

export type IgdbDiscoverySeed = { gameId: number; title: string; platform: string };

export type VerifiedIgdbSuggestion = {
  key: string;
  reference: string;
  title: string;
  platform: string;
  reason: string;
  score: number;
  origin: "series" | "platform";
  catalog: CanonicalGameIdentity;
  anchorGameId?: number;
  anchorTitle?: string;
};

export function catalogSuggestionReference(gameId: number, platformId: number): string {
  return JSON.stringify(["igdb", gameId, platformId]);
}

/** Only use IGDB game IDs that were resolved against owned Collection copies. */
export function verifiedCatalogSuggestions(
  library: Pick<LibraryData, "collection" | "wishlist">,
  seeds: readonly IgdbDiscoverySeed[],
  seriesRoots: readonly IgdbDiscoveryGame[],
  collections: readonly IgdbDiscoveryCollection[],
  seriesGames: readonly IgdbDiscoveryGame[],
  ratedGames: readonly IgdbDiscoveryGame[],
  at: string,
): VerifiedIgdbSuggestion[] {
  const owned = library.collection.filter((game) => game.keepStatus === "Collection");
  const currentIdentities = new Set([
    ...library.collection.map(wishlistSuggestionIdentity),
    ...library.wishlist.map(wishlistSuggestionIdentity),
  ]);
  const currentTitles = new Set([
    ...library.collection.map((g) => normalizeMatchText(g.title)),
    ...library.wishlist.map((g) => normalizeMatchText(g.title)),
  ]);
  const knownIds = new Set([
    ...library.collection.map((g) => g.catalog?.sourceGameId).filter((id): id is number => Number.isInteger(id)),
    ...library.wishlist.map((g) => g.catalog?.sourceGameId).filter((id): id is number => Number.isInteger(id)),
  ]);
  const platformCounts = new Map<string, { count: number; name: string }>();
  for (const game of owned) {
    const id = igdbPlatformId(game.platform);
    if (!id) continue;
    const previous = platformCounts.get(String(id));
    platformCounts.set(String(id), { count: (previous?.count ?? 0) + 1, name: game.platform });
  }

  const roots = new Map<number, { title: string; collectionIds: number[] }>();
  const sourceById = new Map(seriesRoots.map((game) => [game.id, game]));
  for (const seed of seeds) {
    if (!owned.some((copy) =>
      wishlistSuggestionIdentity(copy) === wishlistSuggestionIdentity(seed) &&
      (copy.catalog?.sourceGameId === seed.gameId || normalizeMatchText(copy.title) === normalizeMatchText(seed.title))
    )) continue;
    const original = sourceById.get(seed.gameId);
    if (!original || !Array.isArray(original.collections)) continue;
    roots.set(seed.gameId, { title: seed.title, collectionIds: original.collections });
  }
  const collectionLookup = new Map(collections.map((collection) => [collection.id, collection]));
  const sourceByCollection = new Map<number, { title: string; count: number }>();
  for (const root of roots.values()) {
    for (const id of root.collectionIds) {
      if (!collectionLookup.has(id)) continue;
      const prev = sourceByCollection.get(id);
      sourceByCollection.set(id, { title: prev?.title ?? root.title, count: (prev?.count ?? 0) + 1 });
    }
  }
  const result = new Map<string, VerifiedIgdbSuggestion>();
  function add(game: IgdbDiscoveryGame, type: "series" | "platform") {
    if (!Number.isSafeInteger(game.id) || game.id <= 0 || !game.name?.trim() ||
        game.game_type !== 0 || (game.version_parent != null && game.version_parent !== 0) ||
        knownIds.has(game.id) || currentTitles.has(normalizeMatchText(game.name)) ||
        !Array.isArray(game.platforms)) return;
    const candidates = [...new Set(game.platforms.map(Number))]
      .map((id) => ({ id, owned: platformCounts.get(String(id)) }))
      .filter((entry) => entry.owned && entry.owned.count >= 2)
      .sort((a, b) => (b.owned?.count ?? 0) - (a.owned?.count ?? 0) || a.id - b.id);
    const platform = candidates[0];
    if (!platform?.owned) return;
    const key = wishlistSuggestionIdentity({ title: game.name, platform: platform.owned.name });
    if (currentIdentities.has(key)) return;
    const association = (game.collections ?? [])
      .map((id) => ({ id, owned: sourceByCollection.get(id) }))
      .filter((item) => Boolean(item.owned))
      .sort((a, b) => (b.owned?.count ?? 0) - (a.owned?.count ?? 0));
    const linked = association[0];
    if (type === "series" && !linked?.owned) return;
    const rating = Number(game.total_rating);
    if (type === "platform" && (
      !Number.isFinite(rating) || rating < 85 ||
      Number(game.total_rating_count ?? 0) < 15 ||
      platform.owned.count < 4
    )) return;
    const reason = linked?.owned
      ? "Pertence à mesma série que “" + linked.owned.title + "” (relação confirmada no IGDB)"
      : "Bem avaliado no IGDB (" + Math.round(rating) + "/100) para " + platform.owned.name +
        ", uma consola com " + platform.owned.count + " jogos na tua coleção";
    const score = linked?.owned ? 400 + Math.min(linked.owned.count, 5) * 20
      : 130 + Math.round(rating);
    const catalog: CanonicalGameIdentity = {
      source: "IGDB", sourceGameId: game.id, sourcePlatformId: platform.id,
      title: game.name.trim(), platform: platform.owned.name, edition: "Standard",
      summary: "", firstReleaseDate: game.first_release_date ?
        new Date(game.first_release_date * 1000).toISOString().slice(0, 10) : "",
      genres: [], developers: [], publishers: [],
      coverImageId: game.cover?.image_id ?? "", selectedAt: at,
    };
    const candidate: VerifiedIgdbSuggestion = {
      key, reference: catalogSuggestionReference(game.id, platform.id),
      title: game.name.trim(), platform: platform.owned.name,
      reason, score, origin: linked?.owned ? "series" : "platform",
      catalog, ...(linked?.owned ? {
        anchorGameId: [...roots].find(([, root]) => root.collectionIds.includes(linked.id))?.[0],
        anchorTitle: linked.owned.title,
      } : {}),
    };
    const earlier = result.get(key);
    if (!earlier || candidate.score > earlier.score) result.set(key, candidate);
  }
  for (const game of seriesGames) add(game, "series");
  for (const game of ratedGames) add(game, "platform");
  // Promote actual, verifiable series relationships; keep only a few
  // broad platform picks so recommendations are personal rather than filler.
  const sorted = [...result.values()].sort((a, b) =>
    b.score - a.score ||
    a.platform.localeCompare(b.platform, "pt-PT") ||
    a.title.localeCompare(b.title, "pt-PT")
  );
  const perPlatform = new Map<string, number>();
  return sorted.filter((item) => {
    if (item.origin === "series") return true;
    const count = perPlatform.get(item.platform) ?? 0;
    if (count >= 2) return false;
    perPlatform.set(item.platform, count + 1);
    return true;
  }).slice(0, 30);
}
