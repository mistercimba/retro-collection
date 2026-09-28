import "server-only";
import { getCollectionGames } from "@/lib/data/collection-service";
import type { CollectionGame } from "@/lib/data/types";
import { getGameMetadata } from "@/lib/game-metadata";
import { getPricechartingEstimates, type PriceEstimate } from "@/lib/pricecharting-catalog";

export type CollectionListGame = CollectionGame & {
  genre: string;
  currentValueEur: number | null;
  currentValueSource: string;
  priceEstimate: PriceEstimate;
};

export async function enrichGameList(games: CollectionGame[]): Promise<CollectionListGame[]> {
  const estimates = await getPricechartingEstimates(games);
  return games.map((game) => {
    const metadata = getGameMetadata(game.collectionId);
    const priceEstimate = estimates.get(game.collectionId) ?? { value: null, source: "Estimativa indisponível", date: "", basis: "", productUrl: "" };
    return {
      ...game,
      genre: metadata?.matchStatus === "matched" ? metadata.genres?.join(", ") ?? "" : "",
      currentValueEur: priceEstimate.value ?? game.marketValueEur,
      currentValueSource: priceEstimate.value !== null ? priceEstimate.source : game.marketValueEur !== null ? "Valor registado na coleção" : "Não disponível",
      priceEstimate,
    };
  });
}

export async function getCollectionListGames(): Promise<CollectionListGame[]> {
  return enrichGameList(await getCollectionGames());
}

export function collectionValue(games: Pick<CollectionListGame, "currentValueEur">[]) {
  const available = games.filter((game) => game.currentValueEur !== null);
  return available.length ? available.reduce((sum, game) => sum + (game.currentValueEur ?? 0), 0) : null;
}
