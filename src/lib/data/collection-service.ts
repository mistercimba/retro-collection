import { getDataProvider, getProviderMode } from "./provider";
import { joinCollectionWithAudit, parseAuditRow, parseCollectionRow } from "./parsers";
import { platformSlug } from "./platforms";
import { matchWantTarget } from "./wishlist-matching";
import { isAuditCompleted, selectLatestValuation } from "./collection-integrity";
import type { CollectionGame, CollectionStats, WantListEntry } from "./types";

export async function getAllGames(): Promise<CollectionGame[]> {
  const raw = await getDataProvider().read();
  const collection = raw.collection
    .map(parseCollectionRow)
    .filter((item) => item.collectionId && item.title)
    .map((item) => ({ ...item, platform: raw.platformOverrides?.[item.collectionId] ?? item.platform }));
  const audit = raw.audit.map(parseAuditRow).filter((entry) => entry.collectionId);
  return joinCollectionWithAudit(collection, audit);
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

export async function getGame(collectionId: string): Promise<CollectionGame | null> {
  const [raw, games] = await Promise.all([getDataProvider().read(), getAllGames()]);
  const game = games.find((item) => item.collectionId === collectionId);
  if (!game) return null;
  return {
    ...game,
    latestValuation: selectLatestValuation(game.collectionId, game.catalogId, raw.valuations ?? []),
    purchase: (raw.purchases ?? []).find((purchase) => purchase.purchaseId === game.purchaseId) ?? null,
  };
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
        marketValueEur: items.reduce((sum, game) => sum + (game.marketValueEur ?? 0), 0),
      };
    })
    .sort((a, b) => b.count - a.count || a.platform.localeCompare(b.platform));

  return {
    kept: kept.length,
    sell: sell.length,
    sold: games.filter((g) => g.keepStatus === "Sold").length,
    review: kept.filter((g) => g.needsReview).length,
    auditRecords: games.filter((game) => isAuditCompleted(game.audit?.auditStatus)).length,
    marketValueEur: kept.reduce((sum, game) => sum + (game.marketValueEur ?? 0), 0),
    platforms,
  };
}

export async function getWantlist(): Promise<WantListEntry[]> {
  const [raw, games] = await Promise.all([getDataProvider().read(), getAllGames()]);
  const kept = games.filter((game) => game.keepStatus === "Collection");
  const priorityOrder: Record<string, number> = { grail: 0, alta: 0, média: 1, media: 1, baixa: 2 };
  return (raw.wantlist ?? []).map((target) => ({ ...target, ...matchWantTarget(target, kept) })).sort((a, b) =>
    (priorityOrder[a.priority.trim().toLocaleLowerCase("pt-PT")] ?? 3) - (priorityOrder[b.priority.trim().toLocaleLowerCase("pt-PT")] ?? 3) ||
    Number(b.priceCeilingEur !== null) - Number(a.priceCeilingEur !== null) ||
    a.platform.localeCompare(b.platform, "pt-PT") ||
    a.title.localeCompare(b.title, "pt-PT"),
  );
}

export const dataMode = getProviderMode;
