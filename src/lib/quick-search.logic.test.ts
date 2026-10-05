import { describe, expect, it } from "vitest";
import { findQuickSearchMatches, findQuickSearchWishlistMatches, toQuickSearchableGame } from "./quick-search.logic";

const games = [
  { title: "Pokémon Stadium", platform: "N64", collectionId: "N64-1", edition: "PAL", region: "Europe", overallStatus: "Complete", keepStatus: "Collection" },
  { title: "Silent Hill 2", platform: "Playstation 2", collectionId: "PS2-1", edition: "Black Label", region: "PAL", overallStatus: "Complete", keepStatus: "Collection" },
  { title: "Zelda: Ocarina of Time", platform: "Nintendo 64", collectionId: "N64-2", edition: "PAL", region: "Europe", overallStatus: "Complete", keepStatus: "Collection" },
];

const wishlist = [
  { title: "Chrono Trigger", platform: "Nintendo DS", targetId: "W-1", targetVersion: "PAL · CIB", priority: "Alta" },
  { title: "The Story of Thor", platform: "Mega Drive", targetId: "W-2", targetVersion: "PAL", priority: "Média" },
];

describe("Quick Search matches", () => {
  it("matches accents and unordered words across title and platform", () => {
    expect(findQuickSearchMatches(games, "pokemon n64").map((game) => game.collectionId)).toEqual(["N64-1"]);
    expect(findQuickSearchMatches(games, "hill silent").map((game) => game.collectionId)).toEqual(["PS2-1"]);
  });

  it("keeps only the fields required by the client quick search", () => {
    expect(toQuickSearchableGame({ ...games[0], notes: "do not serialize" } as typeof games[0] & { notes: string })).toEqual(games[0]);
  });

  it("searches wishlist title, platform, target version and priority", () => {
    expect(findQuickSearchWishlistMatches(wishlist, "chrono ds").map((target) => target.targetId)).toEqual(["W-1"]);
    expect(findQuickSearchWishlistMatches(wishlist, "cib alta").map((target) => target.targetId)).toEqual(["W-1"]);
    expect(findQuickSearchWishlistMatches(wishlist, "wishlist story").map((target) => target.targetId)).toEqual(["W-2"]);
  });

  it("waits for at least two searchable characters", () => {
    expect(findQuickSearchMatches(games, "p")).toEqual([]);
    expect(findQuickSearchWishlistMatches(wishlist, "c")).toEqual([]);
  });
});
