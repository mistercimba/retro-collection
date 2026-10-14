import "server-only";

import type { LibraryData } from "./data/types";
import { queryVerifiedIgdb, searchCanonicalGames } from "./igdb-catalog";
import { igdbPlatformId } from "./igdb-catalog.logic";
import { wishlistSuggestionIdentity, suggestWishlistListGaps, combineWishlistSuggestions } from "./wishlist-list-suggestions.logic";
import {
  type IgdbDiscoveryCollection, type IgdbDiscoveryGame, type IgdbDiscoverySeed,
  type VerifiedIgdbSuggestion, verifiedCatalogSuggestions, hasEuropeanReleaseOnPlatform,
} from "./wishlist-catalog-suggestions.logic";
import { normalizeMatchText } from "./data/wishlist-matching";

type CandidateLibrary = Pick<LibraryData, "collection" | "wishlist" | "collectionLists">;
const fields = [
  "id", "name", "platforms", "collections", "game_type", "version_parent",
  "first_release_date", "total_rating", "total_rating_count", "cover.image_id",
  "release_dates.platform", "release_dates.release_region",
].join(",");

function numbers(ids: readonly number[], limit = 200): string {
  return [...new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0))]
    .slice(0, limit).join(",");
}

async function ownedSeeds(library: CandidateLibrary): Promise<IgdbDiscoverySeed[]> {
  const owned = library.collection.filter((game) => game.keepStatus === "Collection");
  const known = new Set<number>();
  const seeds: IgdbDiscoverySeed[] = [];
  for (const game of owned) {
    const gameId = game.catalog?.sourceGameId ||
      Number(game.catalogId?.match(/^IGDB:(\d+)$/i)?.[1] ?? 0);
    if (!Number.isSafeInteger(gameId) || gameId <= 0 || !igdbPlatformId(game.platform) || known.has(gameId)) continue;
    seeds.push({ gameId, title: game.title, platform: game.platform });
    known.add(gameId);
  }

  // Legacy copied titles may have no canonical ID. Resolve a small, diverse
  // set by an exact IGDB title + platform match; never guess franchise links.
  const counts = new Map<string, number>();
  for (const game of owned) counts.set(game.platform, (counts.get(game.platform) ?? 0) + 1);
  const platforms = [...counts.keys()].filter((platform) => igdbPlatformId(platform))
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b));
  const legacy = platforms.slice(0, 5).flatMap((platform) =>
    owned.filter((game) => game.platform === platform && !game.catalog?.sourceGameId)
      .sort((a, b) => a.title.localeCompare(b.title, "pt-PT"))
      .slice(0, 4)
  ).slice(0, 16);
  for (let index = 0; index < legacy.length; index += 3) {
    const chunk = await Promise.all(legacy.slice(index, index + 3).map(async (game) => {
      const found = await searchCanonicalGames(game.title, game.platform);
      const exact = found.find((item) =>
        normalizeMatchText(item.title) === normalizeMatchText(game.title) &&
        item.platform === game.platform
      );
      return exact ? { gameId: exact.gameId, title: game.title, platform: game.platform } : null;
    }));
    for (const seed of chunk) if (seed && !known.has(seed.gameId)) {
      seeds.push(seed);
      known.add(seed.gameId);
    }
  }
  return seeds.slice(0, 45);
}

async function verifiedListSuggestions(library: CandidateLibrary): Promise<VerifiedIgdbSuggestion[]> {
  // User-authored targets are valuable, but they are not PAL proof by
  // themselves. Every proposed game must have an IGDB Europe release record
  // for its exact console before it is displayed or accepted.
  const gaps = suggestWishlistListGaps(library).slice(0, 20);
  if (!gaps.length) return [];
  const exact: Array<{ gap: (typeof gaps)[number]; matched: Awaited<ReturnType<typeof searchCanonicalGames>>[number] }> = [];
  for (let offset = 0; offset < gaps.length; offset += 2) {
    const resolved = await Promise.all(gaps.slice(offset, offset + 2).map(async (gap) => {
      const matches = await searchCanonicalGames(gap.title, gap.platform);
      const matched = matches.find((candidate) =>
        candidate.platform === gap.platform &&
        normalizeMatchText(candidate.title) === normalizeMatchText(gap.title) &&
        candidate.edition === "Standard"
      );
      return matched ? { gap, matched } : null;
    }));
    for (const entry of resolved) if (entry) exact.push(entry);
  }
  if (!exact.length) return [];
  const found: IgdbDiscoveryGame[] = [];
  const ids = [...new Set(exact.map((item) => item.matched.gameId))];
  for (let offset = 0; offset < ids.length; offset += 100) {
    found.push(...await queryVerifiedIgdb<IgdbDiscoveryGame>("games",
      "fields " + fields + "; where id = (" +
      numbers(ids.slice(offset, offset + 100)) + "); limit 100;"));
  }
  const byId = new Map(found.map((item) => [item.id, item]));
  return exact.flatMap(({ gap, matched }) => {
    const game = byId.get(matched.gameId);
    if (!game || !hasEuropeanReleaseOnPlatform(game, matched.platformId) ||
        (game.game_type !== undefined && game.game_type !== 0)) return [];
    return [{
      key: wishlistSuggestionIdentity(gap),
      reference: gap.reference,
      title: gap.title, platform: gap.platform,
      reason: gap.reason, score: gap.score,
      origin: "list" as const, euReleaseVerified: true as const,
      catalog: {
        source: "IGDB" as const, sourceGameId: matched.gameId,
        sourcePlatformId: matched.platformId,
        title: matched.title, platform: matched.platform,
        edition: matched.edition, summary: matched.summary,
        firstReleaseDate: matched.firstReleaseDate,
        genres: matched.genres, developers: matched.developers,
        publishers: matched.publishers, coverImageId: matched.coverImageId,
        selectedAt: new Date().toISOString(),
      },
    }];
  });
}

async function catalogVerifiedSuggestions(library: CandidateLibrary): Promise<VerifiedIgdbSuggestion[]> {
  const owned = library.collection.filter((game) => game.keepStatus === "Collection");
  const platformCounts = new Map<number, number>();
  for (const game of owned) {
    const id = igdbPlatformId(game.platform);
    if (id) platformCounts.set(id, (platformCounts.get(id) ?? 0) + 1);
  }
  const platformIds = [...platformCounts].filter(([, count]) => count >= 4)
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  if (!platformCounts.size) return [];

  const rated = platformIds.length
    ? queryVerifiedIgdb<IgdbDiscoveryGame>("games",
      "fields " + fields + "; where game_type = 0 & platforms = (" + numbers(platformIds) +
      ") & total_rating >= 85 & total_rating_count >= 15; sort total_rating desc; limit 180;")
    : Promise.resolve([]);

  const seeds = await ownedSeeds(library);
  let roots: IgdbDiscoveryGame[] = [];
  let collections: IgdbDiscoveryCollection[] = [];
  const siblings: IgdbDiscoveryGame[] = [];
  if (seeds.length) {
    roots = await queryVerifiedIgdb<IgdbDiscoveryGame>("games",
      "fields id,name,collections,platforms; where id = (" +
      numbers(seeds.map((seed) => seed.gameId), 45) + "); limit 100;");
    const ids = numbers(roots.flatMap((root) => root.collections ?? []), 30);
    if (ids) {
      collections = await queryVerifiedIgdb<IgdbDiscoveryCollection>("collections",
        "fields id,name,games; where id = (" + ids + "); limit 100;");
      // Broad catalogue families are too vague to use as a series claim.
      collections = collections.filter((item) => Array.isArray(item.games) && item.games.length <= 100);
      const siblingIds = [...new Set(collections.flatMap((item) => item.games ?? []))]
        .filter((id) => !seeds.some((seed) => seed.gameId === id)).slice(0, 240);
      for (let index = 0; index < siblingIds.length; index += 100) {
        siblings.push(...await queryVerifiedIgdb<IgdbDiscoveryGame>("games",
          "fields " + fields + "; where id = (" +
          numbers(siblingIds.slice(index, index + 100)) + "); limit 100;"));
      }
    }
  }
  return verifiedCatalogSuggestions(library, seeds, roots, collections, siblings,
    await rated, new Date().toISOString());
}

/** Read-only; catalogue outages never block trusted user-authored list goals. */
export async function loadWishlistSuggestions(library: CandidateLibrary) {
  let catalogCandidates: VerifiedIgdbSuggestion[] = [];
  let catalogUnavailable = false;
  try {
    catalogCandidates = await catalogVerifiedSuggestions(library);
  } catch (error) {
    catalogUnavailable = true;
    console.error("wishlist_suggestions_catalog_unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
  let verifiedLists: VerifiedIgdbSuggestion[] = [];
  try {
    verifiedLists = await verifiedListSuggestions(library);
  } catch (error) {
    catalogUnavailable = true;
    console.error("wishlist_suggestions_pal_verification_unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
  const verified = [...verifiedLists, ...catalogCandidates];
  return {
    catalogCandidates: verified, catalogUnavailable,
    suggestions: combineWishlistSuggestions(library, verified),
  };
}
