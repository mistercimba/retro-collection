import "server-only";
import { unstable_cache } from "next/cache";
import type { CollectionGame, PurchaseRecord, ValuationSnapshot } from "@/lib/data/types";
import { selectLatestValuation } from "@/lib/data/collection-integrity";
import { resolveCopyValue, type CopyValue } from "@/lib/collection-valuation.logic";
import { resolveGameMetadata } from "@/lib/game-metadata";
import { getLibrary, LIBRARY_CACHE_TAG } from "@/lib/library-store";
import { getPricechartingCatalogSnapshot, getPricechartingEstimates, type PriceEstimate } from "@/lib/pricecharting-catalog";

export type CollectionListGame = CollectionGame & {
  genre: string;
  currentValueEur: number | null;
  currentValueSource: string;
  currentValueInfo: CopyValue;
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
  valuations: ValuationSnapshot[] = [],
): CollectionListGame[] {
  return games.map((game) => {
    const metadata = resolveGameMetadata(game);
    const priceEstimate = estimates.get(game.collectionId) ?? { value: null, source: "Estimativa indisponível", date: "", basis: "", productUrl: "" };
    const purchase = game.purchaseId ? purchases.get(game.purchaseId) : undefined;
    const latestValuation = selectLatestValuation(game.collectionId, game.catalogId, valuations);
    const currentValueInfo = resolveCopyValue({ ...game, latestValuation }, priceEstimate);
    return {
      ...game,
      latestValuation,
      genre: metadata?.matchStatus === "matched" ? metadata.genres?.join(", ") ?? "" : "",
      currentValueEur: currentValueInfo.value,
      currentValueSource: currentValueInfo.source,
      currentValueInfo,
      priceEstimate,
      purchasePaidEur: purchase?.totalPaidEur ?? game.allocatedCostEur ?? null,
    };
  });
}

export async function enrichGameList(games: CollectionGame[]): Promise<CollectionListGame[]> {
  const [estimates, library] = await Promise.all([getPricechartingEstimates(games), getLibrary()]);
  return withEstimates(games, estimates, purchaseMap(library.purchases), library.valuations);
}

async function buildCollectionListGames(): Promise<CollectionListGame[]> {
  const [library, catalog] = await Promise.all([getLibrary(), getPricechartingCatalogSnapshot()]);
  const games = library.collection.filter((game) => game.keepStatus === "Collection");
  const estimates = await getPricechartingEstimates(games, Promise.resolve(catalog));
  return withEstimates(games, estimates, purchaseMap(library.purchases), library.valuations);
}

const getCachedCollectionListGames = unstable_cache(
  buildCollectionListGames,
  ["collection-list-games-v2"],
  { tags: [LIBRARY_CACHE_TAG], revalidate: 3600 },
);

export async function getCollectionListGames(): Promise<CollectionListGame[]> {
  return getCachedCollectionListGames();
}

export function collectionValue(games: Pick<CollectionListGame, "currentValueEur">[]) {
  const available = games.filter((game) => game.currentValueEur !== null);
  return available.length ? available.reduce((sum, game) => sum + (game.currentValueEur ?? 0), 0) : null;
}
