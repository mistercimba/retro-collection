import { describe, expect, it } from "vitest";
import { buildGameMetadataSnapshot, resolveCollectionPlatform, resolveIGDBMatch } from "../../../scripts/igdb-refresh-logic.mjs";

const platformIds = { NES: 18 };
const candidate = (id: number, name: string, platformId = 18) => ({ id, name, platforms: [{ id: platformId, name: "Nintendo Entertainment System" }] });

describe("IGDB matching and snapshot replacement", () => {
  it("uses the workbook's GB/GBC row identity to resolve combined collection platforms", () => {
    const overrides = { GB001: "Game Boy", GBC001: "Game Boy Color" };
    expect(resolveCollectionPlatform("GB001", "GameBoy + Color", overrides)).toBe("Game Boy");
    expect(resolveCollectionPlatform("GBC001", "GameBoy + Color", overrides)).toBe("Game Boy Color");
    expect(resolveCollectionPlatform("OTHER", "NES", overrides)).toBe("NES");
  });
  it("accepts exactly one title and platform match", () => {
    expect(resolveIGDBMatch("Example Game", "NES", [candidate(1, "Example Game")], platformIds)).toMatchObject({ status: "matched", candidate: { id: 1 } });
  });

  it("marks multiple exact platform matches ambiguous", () => {
    expect(resolveIGDBMatch("Example Game", "NES", [candidate(1, "Example Game"), candidate(2, "Example Game")], platformIds).status).toBe("ambiguous");
  });

  it("marks no exact platform match unmatched", () => {
    expect(resolveIGDBMatch("Example Game", "NES", [candidate(1, "Different Game")], platformIds).status).toBe("unmatched");
  });

  it("rebuilds entries so stale metadata is replaced by explicit ambiguous/unmatched states", () => {
    const previousSnapshot = { COPY: { matchStatus: "matched", aggregatedRating: 99 }, REMOVED: { matchStatus: "matched" } };
    const nextSnapshot = buildGameMetadataSnapshot([
      { collectionIds: ["COPY"], result: { status: "ambiguous", candidate: null, reason: "multiple-exact-platform-matches", candidates: [candidate(1, "Example Game"), candidate(2, "Example Game")] }, refreshedAt: "2026-09-27" },
      { collectionIds: ["NEW"], result: { status: "unmatched", candidate: null, reason: "no-exact-match", candidates: [] }, refreshedAt: "2026-09-27" },
    ]);
    expect(previousSnapshot.COPY.aggregatedRating).toBe(99);
    expect(nextSnapshot.COPY).toMatchObject({ source: "IGDB", matchStatus: "ambiguous", matchReason: "multiple-exact-platform-matches" });
    expect(nextSnapshot.COPY).not.toHaveProperty("aggregatedRating");
    expect(nextSnapshot.NEW).toMatchObject({ matchStatus: "unmatched", matchReason: "no-exact-match" });
    expect(nextSnapshot).not.toHaveProperty("REMOVED");
  });
});
