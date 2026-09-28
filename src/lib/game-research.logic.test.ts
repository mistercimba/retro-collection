import { describe, expect, it, vi } from "vitest";
import type { MatchedGameMetadata, UnresolvedGameMetadata } from "./game-metadata";
import { resolveCatalogResearch, type ResearchCatalog } from "./game-research.logic";

const silentHill: MatchedGameMetadata = {
  matchStatus: "matched",
  source: "IGDB",
  sourceGameId: 480,
  title: "Silent Hill",
  summary: "A psychological survival horror game.",
  firstReleaseDate: "1999-02-24",
  genres: ["Puzzle", "Adventure"],
  gameModes: ["Single player"],
  themes: ["Horror", "Survival"],
  perspectives: ["Third person"],
  developers: ["Team Silent"],
  publishers: ["Konami"],
  aggregatedRating: 82,
  aggregatedRatingCount: 10,
  userRating: null,
  userRatingCount: 0,
  refreshedAt: "2026-09-27T22:46:00.000Z",
};

const emptyFallback: ResearchCatalog = { metadata: null, metadataState: "unavailable" };

describe("game research catalog source", () => {
  it("keeps matched snapshot metadata when runtime title lookup would fail", async () => {
    const loadSnapshotPlaytime = vi.fn().mockRejectedValue(new Error("IGDB temporarily unavailable"));
    const loadRuntimeFallback = vi.fn().mockRejectedValue(new Error("runtime title lookup failed"));

    const result = await resolveCatalogResearch(silentHill, loadSnapshotPlaytime, loadRuntimeFallback);

    expect(loadSnapshotPlaytime).toHaveBeenCalledExactlyOnceWith(480);
    expect(loadRuntimeFallback).not.toHaveBeenCalled();
    expect(result.metadataState).toBe("matched");
    expect(result.metadata).toMatchObject({
      title: "Silent Hill",
      summary: "A psychological survival horror game.",
      genres: ["Puzzle", "Adventure"],
      developers: ["Team Silent"],
      publishers: ["Konami"],
      firstReleaseDate: "1999-02-24",
      aggregatedRating: 82,
      timeToBeat: { main: "", extras: "", completionist: "" },
    });
  });

  it("loads playtime directly by snapshot sourceGameId", async () => {
    const loadSnapshotPlaytime = vi.fn().mockResolvedValue({ main: "8 h", extras: "12 h", completionist: "20 h" });
    const result = await resolveCatalogResearch(silentHill, loadSnapshotPlaytime, vi.fn());

    expect(loadSnapshotPlaytime).toHaveBeenCalledExactlyOnceWith(silentHill.sourceGameId);
    expect(result.metadata?.timeToBeat).toEqual({ main: "8 h", extras: "12 h", completionist: "20 h" });
  });

  it("uses runtime title matching only when the snapshot has no matched entry", async () => {
    const unresolved: UnresolvedGameMetadata = {
      matchStatus: "unmatched",
      source: "IGDB",
      matchReason: "no-title-match",
      refreshedAt: "2026-09-27T22:46:00.000Z",
    };
    const loadRuntimeFallback = vi.fn().mockResolvedValue(emptyFallback);

    const result = await resolveCatalogResearch(unresolved, vi.fn(), loadRuntimeFallback);

    expect(loadRuntimeFallback).toHaveBeenCalledOnce();
    expect(result).toBe(emptyFallback);
  });
});
