import { getLibrary } from "@/lib/library-store";
import { platformSlug } from "./platforms";
import { matchWantTarget } from "./wishlist-matching";
import { isAuditCompleted, selectLatestValuation } from "./collection-integrity";
import { sumKnownMarketValues } from "./collection-stats.logic";
import { selectPhysicalCopies } from "@/lib/copy-groups.logic";
import type { CollectionGame, CollectionStats, LibraryData, WantListEntry } from "./types";
import { buildComponentNeedEntries, buildComponentNeedHistory } from "@/lib/component-needs.logic";
import { resolveNextObjective } from "@/lib/next-objective.logic";

export async function getAllGames(): Promise<CollectionGame[]> {
  return (await getLibrary()).collection;
}

export async function getCollectionGames(): Promise<CollectionGame[]> {
  return (await getAllGames()).filter((game) => game.keepStatus === "Collection");
}

export async function getSellAndSoldGames(): Promise<{ forSale: CollectionGame[]; sold: CollectionGame[] }> {
  const games = await getAllGames();
  return {
    forSale: games.filter((game) => game.keepStatus === "Sell"),
    sold: games.filter((game) => game.keepStatus === "Sold"),
  };
}

function hydrateGame(library: LibraryData, game: CollectionGame): CollectionGame {
  return {
    ...game,
    latestValuation: selectLatestValuation(game.collectionId, game.catalogId, library.valuations),
    purchase: library.purchases.find((purchase) => purchase.purchaseId === game.purchaseId) ?? null,
  };
}

export async function getGame(collectionId: string): Promise<CollectionGame | null> {
  const library = await getLibrary();
  const game = library.collection.find((item) => item.collectionId === collectionId);
  return game ? hydrateGame(library, game) : null;
}

export async function getGameCopies(collectionId: string): Promise<CollectionGame[]> {
  const library = await getLibrary();
  const current = library.collection.find((item) => item.collectionId === collectionId);
  if (!current) return [];
  return selectPhysicalCopies(library.collection, current).map((game) => hydrateGame(library, game));
}

export async function getStats(): Promise<CollectionStats> {
  const games = await getAllGames();
  const kept = games.filter((g) => g.keepStatus === "Collection");
  const sell = games.filter((g) => g.keepStatus === "Sell");
  const platforms = [...new Set(kept.map((game) => game.platform))]
    .map((platform) => {
      const items = kept.filter((game) => game.platform === platform);
      return {
        platform,
        slug: platformSlug(platform),
        count: items.length,
        audited: items.filter((game) => isAuditCompleted(game.audit?.auditStatus)).length,
        review: items.filter((game) => game.needsReview).length,
        marketValueEur: sumKnownMarketValues(items),
      };
    });

  return {
    kept: kept.length,
    sell: sell.length,
    sold: games.filter((g) => g.keepStatus === "Sold").length,
    review: kept.filter((g) => g.needsReview).length,
    auditRecords: games.filter((game) => isAuditCompleted(game.audit?.auditStatus)).length,
    marketValueEur: sumKnownMarketValues(kept),
    platforms,
  };
}

export async function getWantlist(): Promise<WantListEntry[]> {
  const library = await getLibrary();
  const kept = library.collection.filter((game) => game.keepStatus === "Collection");
  const priorityOrder: Record<string, number> = { grail: 0, alta: 0, média: 1, media: 1, baixa: 2 };
  return library.wishlist.map((target) => ({
    ...target,
    ...matchWantTarget(target, kept),
    purchase: target.acquisition?.purchaseId
      ? library.purchases.find((purchase) => purchase.purchaseId === target.acquisition?.purchaseId) ?? null
      : null,
  })).sort((a, b) =>
    (priorityOrder[a.priority.trim().toLocaleLowerCase("pt-PT")] ?? 3) - (priorityOrder[b.priority.trim().toLocaleLowerCase("pt-PT")] ?? 3) ||
    Number(b.priceCeilingEur !== null) - Number(a.priceCeilingEur !== null) ||
    a.platform.localeCompare(b.platform, "pt-PT") ||
    a.title.localeCompare(b.title, "pt-PT"),
  );
}

export async function getNextObjective() {
  const [library, targets] = await Promise.all([getLibrary(), getWantlist()]);
  return resolveNextObjective(library.nextObjective ?? null, targets);
}

export async function getComponentCompletionQueue() {
  const library = await getLibrary();
  return {
    active: buildComponentNeedEntries(library.collection, library.componentNeeds ?? []),
    history: buildComponentNeedHistory(library.collection, library.componentNeeds ?? []),
  };
}

export async function getComponentNeedsForGame(collectionId: string) {
  const library = await getLibrary();
  return {
    active: buildComponentNeedEntries(library.collection, library.componentNeeds ?? [])
      .filter((need) => need.collectionId === collectionId),
    history: buildComponentNeedHistory(library.collection, library.componentNeeds ?? [])
      .filter((need) => need.collectionId === collectionId),
  };
}

export const dataMode = () => "library" as const;