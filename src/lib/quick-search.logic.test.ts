import { describe, expect, it } from "vitest";
import { findQuickSearchMatches } from "./quick-search.logic";

const games = [
  { title: "Pokémon Stadium", platform: "N64", collectionId: "N64-1", edition: "PAL", region: "Europe", overallStatus: "Complete" },
  { title: "Silent Hill 2", platform: "Playstation 2", collectionId: "PS2-1", edition: "Black Label", region: "PAL", overallStatus: "Complete" },
  { title: "Zelda: Ocarina of Time", platform: "Nintendo 64", collectionId: "N64-2", edition: "PAL", region: "Europe", overallStatus: "Complete" },
];

describe("Quick Search matches", () => {
  it("matches accents and unordered words across title and platform", () => {
    expect(findQuickSearchMatches(games, "pokemon n64").map((game) => game.collectionId)).toEqual(["N64-1"]);
    expect(findQuickSearchMatches(games, "hill silent").map((game) => game.collectionId)).toEqual(["PS2-1"]);
  });

  it("waits for at least two searchable characters", () => {
    expect(findQuickSearchMatches(games, "p")).toEqual([]);
  });
});
