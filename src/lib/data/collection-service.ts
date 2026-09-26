import { getDataProvider, getProviderMode } from "./provider";
import { joinCollectionWithAudit, parseAuditRow, parseCollectionRow } from "./parsers";
import { platformSlug } from "./platforms";
import type { CollectionGame, CollectionStats } from "./types";

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

export async function getSellGames(): Promise<CollectionGame[]> {
  return (await getAllGames()).filter((game) => game.keepStatus === "Sell");
}

export async function getGame(collectionId: string): Promise<CollectionGame | null> {
  return (await getAllGames()).find((game) => game.collectionId === collectionId) ?? null;
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
        audited: items.filter((game) => game.audit).length,
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
    auditRecords: games.filter((g) => g.audit).length,
    marketValueEur: kept.reduce((sum, game) => sum + (game.marketValueEur ?? 0), 0),
    platforms,
  };
}

export const dataMode = getProviderMode;
