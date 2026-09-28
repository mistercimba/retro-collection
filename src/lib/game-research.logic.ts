import type { GameMetadata, MatchedGameMetadata, PlaytimeSnapshot } from "./game-metadata";

export type ResearchPlaytime = PlaytimeSnapshot;
export type ResearchCatalog = {
  metadata: (MatchedGameMetadata & { timeToBeat: ResearchPlaytime }) | null;
  metadataState: "matched" | "ambiguous" | "unmatched" | "not-configured" | "unavailable";
};

const EMPTY_PLAYTIME: ResearchPlaytime = { main: "", extras: "", completionist: "" };

export function resolveCatalogResearch(snapshot: GameMetadata | null): ResearchCatalog {
  if (!snapshot) return { metadata: null, metadataState: "unavailable" };
  if (snapshot.matchStatus !== "matched") return { metadata: null, metadataState: snapshot.matchStatus };
  const timeToBeat = snapshot.playtime ?? EMPTY_PLAYTIME;
  return { metadata: { ...snapshot, timeToBeat }, metadataState: "matched" };
}
