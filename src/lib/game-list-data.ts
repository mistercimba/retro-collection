import "server-only";
import { unstable_cache } from "next/cache";
import { getCollectionGames } from "@/lib/data/collection-service";
import type { CollectionGame, PurchaseRecord } from "@/lib/data/types";
import { getGameMetadata } from "@/lib/game-metadata";
import { getLibrary, LIBRARY_CACHE_TAG } from "@/lib/library-store";
import { getPricechartingCatalogSnapshot, getPricechartingEstimates, type PriceEstimate } from "@/lib/pricecharting-catalog";

export type CollectionListGame = CollectionGame & {
  genre: string;
  currentValueEur: number | null;
  currentValueSource: string;
  priceEstimate: PriceEstimate;
  purchasePaidEur: number | null;
};

function purchaseMap(purchases: PurchaseRecord[]) {
  return new Map(purchases.map((purchase) => [purchase.purchaseId, purchase] as const));
}

function withEstimates(
  games: CollectionGame[],
  estimates: Map<string, PriceEstimate>,
  purchases: Map<string, PurchaseRecord> = new Map(),
): CollectionListGame[] {
  return games.map((game) => {
    const metadata = getGameMetadata(game.collectionId);
    const priceEstimate = estimates.get(game.collectionId) ?? { value: null, source: "Estimativa indisponível", date: "", basis: "", productUrl: "" };
    const purchase = game.purchaseId ? purchases.get(game.purchaseId) : undefined;
    return {
      ...game,
      genre: metadata?.matchStatus === "matched" ? metadata.genres?.join(", ") ?? "" : "",
      currentValueEur: priceEstimate.value ?? game.marketValueEur,
      currentValueSource: priceEstimate.value !== null ? priceEstimate.source : game.marketValueEur !== null ? "Valor registado na coleção" : "Não disponível",
      priceEstimate,
      purchasePaidEur: purchase?.totalPaidEur ?? game.allocatedCostEur ?? null,
    };
  });
}

export async function enrichGameList(games: CollectionGame[]): Promise<CollectionListGame[]> {
  return withEstimates(games, await getPricechartingEstimates(games));
}

async function buildCollectionListGames(): Promise<CollectionListGame[]> {
  const [games, catalog, library] = await Promise.all([getCollectionGames(), getPricechartingCatalogSnapshot(), getLibrary()]);
  const estimates = await getPricechartingEstimates(games, Promise.resolve(catalog));
  return withEstimates(games, estimates, purchaseMap(library.purchases));
}

const getCachedCollectionListGames = unstable_cache(
  buildCollectionListGames,
  ["collection-list-games-v1"],
  { tags: [LIBRARY_CACHE_TAG], revalidate: 3600 },
);

export async function getCollectionListGames(): Promise<CollectionListGame[]> {
  return getCachedCollectionListGames();
}

export function collectionValue(games: Pick<CollectionListGame, "currentValueEur">[]) {
  const available = games.filter((game) => game.currentValueEur !== null);
  return available.length ? available.reduce((sum, game) => sum + (game.currentValueEur ?? 0), 0) : null;
}
