import { describe, expect, it } from "vitest";
import type { MatchedGameMetadata } from "./game-metadata";
import { resolveCatalogResearch } from "./game-research.logic";

const snapshot: MatchedGameMetadata = {
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
  playtime: { main: "8 h", extras: "12 h", completionist: "20 h" },
  reviewScore: 82,
  reviewScoreSource: "IGDB aggregated rating",
  reviewScoreUrl: "",
  externalIds: { igdb: 480 },
  refreshedAt: "2026-09-27T22:46:00.000Z",
};

describe("static game metadata", () => {
  it("returns metadata and playtime from the local snapshot", () => {
    const result = resolveCatalogResearch(snapshot);
    expect(result.metadataState).toBe("matched");
    expect(result.metadata?.timeToBeat).toEqual(snapshot.playtime);
  });

  it("does not invoke any runtime fallback for unresolved entries", () => {
    const result = resolveCatalogResearch({ matchStatus: "unmatched", source: "IGDB", refreshedAt: "2026-09-27T22:46:00.000Z" });
    expect(result).toEqual({ metadata: null, metadataState: "unmatched" });
  });
});
