import type { GameMetadata, MatchedGameMetadata } from "./game-metadata";

export type ResearchPlaytime = { main: string; extras: string; completionist: string };
export type ResearchCatalog = {
  metadata: (MatchedGameMetadata & { timeToBeat: ResearchPlaytime }) | null;
  metadataState: "matched" | "ambiguous" | "unmatched" | "not-configured" | "unavailable";
};

const EMPTY_PLAYTIME: ResearchPlaytime = { main: "", extras: "", completionist: "" };

/** Prefer the validated catalog snapshot; runtime title matching is a fallback only. */
export async function resolveCatalogResearch(
  snapshot: GameMetadata | null,
  loadSnapshotPlaytime: (sourceGameId: number) => Promise<ResearchPlaytime>,
  loadRuntimeFallback: () => Promise<ResearchCatalog>,
): Promise<ResearchCatalog> {
  if (snapshot?.matchStatus === "matched") {
    let timeToBeat = EMPTY_PLAYTIME;
    try {
      timeToBeat = await loadSnapshotPlaytime(snapshot.sourceGameId);
    } catch {
      // A playtime failure must not hide static metadata already present in the snapshot.
    }
    return { metadata: { ...snapshot, timeToBeat }, metadataState: "matched" };
  }

  return loadRuntimeFallback();
}
