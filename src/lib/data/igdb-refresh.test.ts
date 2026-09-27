import { describe, expect, it } from "vitest";
import { buildGameMetadataSnapshot, resolveCollectionPlatform, resolveIGDBMatch } from "../../../scripts/igdb-refresh-logic.mjs";

const platformIds = { NES: 18, "Playstation 2": 8, "Nintendo 64": 4 };
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

  it("matches spacing variants only when the compact title and platform identify one candidate", () => {
    expect(resolveIGDBMatch("Choro Q", "Playstation 2", [candidate(3, "ChoroQ", 8)], platformIds)).toMatchObject({ status: "matched", candidate: { id: 3 } });
    expect(resolveIGDBMatch("Choro Q", "Playstation 2", [candidate(3, "ChoroQ", 4)], platformIds)).toMatchObject({ status: "unmatched", reason: "exact-title-platform-mismatch" });
    expect(resolveIGDBMatch("Choro Q", "Playstation 2", [candidate(7, "Choro Q", 18), candidate(8, "ChoroQ", 8)], platformIds)).toMatchObject({ status: "matched", candidate: { id: 8 } });
  });

  it("does not turn compact-key collisions or longer related titles into automatic matches", () => {
    const collision = resolveIGDBMatch("A BC", "Playstation 2", [candidate(4, "AB C", 8), candidate(5, "A B C", 8)], platformIds);
    expect(collision).toMatchObject({ status: "ambiguous", reason: "multiple-exact-platform-matches" });
    expect(resolveIGDBMatch("Choro Q", "Playstation 2", [candidate(6, "ChoroQ HG 4", 8)], platformIds).status).toBe("unmatched");
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
