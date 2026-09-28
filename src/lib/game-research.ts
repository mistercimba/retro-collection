import "server-only";
import type { CollectionGame } from "@/lib/data/types";
import { getGameMetadata, type MatchedGameMetadata } from "@/lib/game-metadata";
import { resolveCatalogResearch, type ResearchPlaytime } from "@/lib/game-research.logic";
import { getPricechartingEstimate, type PriceEstimate } from "@/lib/pricecharting-catalog";

export type Research = {
  metadata: (MatchedGameMetadata & { timeToBeat: ResearchPlaytime }) | null;
  metadataState: "matched" | "ambiguous" | "unmatched" | "not-configured" | "unavailable";
  metascore: { value: number | null; source: string; url: string };
  estimate: PriceEstimate;
};

export async function getGameResearch(game: CollectionGame): Promise<Research> {
  const snapshot = getGameMetadata(game.collectionId);
  const catalog = resolveCatalogResearch(snapshot);
  const [estimate] = await Promise.all([getPricechartingEstimate(game)]);
  const score = snapshot?.matchStatus === "matched" ? snapshot.reviewScore : null;
  const source = snapshot?.matchStatus === "matched" ? snapshot.reviewScoreSource : "Metadata snapshot";
  return {
    ...catalog,
    metascore: { value: score ?? null, source: source || "Review score indisponível no snapshot", url: snapshot?.matchStatus === "matched" ? snapshot.reviewScoreUrl : "" },
    estimate,
  };
}
