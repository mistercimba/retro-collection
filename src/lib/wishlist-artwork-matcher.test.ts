import { describe, expect, it } from "vitest";
import { findExactLaunchboxMatch, findExactSourceMatches, normalizeArtworkTitle, requestedArtworkRegion, sourceArtworkRegion, sourceArtworkTitle } from "../../scripts/wishlist-artwork-matcher.mjs";

describe("wishlist artwork source matcher", () => {
  it("normalizes accents, punctuation, and ampersands without fuzzy matching", () => {
    expect(normalizeArtworkTitle("Pokémon: Alpha & Omega!")).toBe("pokemon alpha and omega");
    expect(normalizeArtworkTitle("Resident Evil 2")).not.toBe(normalizeArtworkTitle("Resident Evil 3"));
  });

  it("prefers the region named by targetVersion and defaults to Europe", () => {
    expect(requestedArtworkRegion("NTSC-U original")).toBe("US");
    expect(requestedArtworkRegion("Japanese NTSC-J")).toBe("Japan");
    expect(requestedArtworkRegion("PAL physical")).toBe("Europe");
  });

  it("rejects an otherwise exact title from an incompatible region", () => {
    const target = { title: "Castlevania", targetVersion: "PAL original" };
    const candidates = [
      { title: "Castlevania", region: sourceArtworkRegion("Castlevania (USA).png") },
    ];
    expect(findExactSourceMatches(target, candidates)).toHaveLength(0);
  });

  it("leaves duplicate exact regional candidates ambiguous", () => {
    const target = { title: "Terranigma", targetVersion: "PAL" };
    const candidates = ["Europe", "Germany"].map((region) => ({
      title: sourceArtworkTitle(`Terranigma (${region}).png`),
      region: sourceArtworkRegion(`Terranigma (${region}).png`),
    }));
    expect(findExactSourceMatches(target, candidates)).toHaveLength(2);
  });

  it("does not infer a region from an unlabelled source", () => {
    expect(sourceArtworkRegion("Game Name.png")).toBeNull();
  });

  it("parses explicit language metadata without treating edition tags as title metadata", () => {
    expect(sourceArtworkTitle("Super Metroid (Europe) (En,Fr,De).png")).toBe("Super Metroid");
    expect(sourceArtworkTitle("Super Metroid (Europe) (Beta).png")).toBe("Super Metroid (Beta)");
  });

  const game = {
    databaseId: "1", title: "Ōkami", platform: "Sony Playstation 2", alternates: [],
    images: [{ fileName: "front.jpg", region: "Europe" }],
  };
  const target = { title: "Okami", targetVersion: "PAL" };

  it("requires one exact LaunchBox game and one regional front cover", () => {
    expect(findExactLaunchboxMatch(target, [game], game.platform).image?.fileName).toBe("front.jpg");
    expect(findExactLaunchboxMatch(target, [game], "Sony Playstation").game).toBeUndefined();
  });

  it("rejects multiple game identities and multiple compatible front covers", () => {
    expect(findExactLaunchboxMatch(target, [game, { ...game, databaseId: "2" }], game.platform).reason).toBe("ambiguous-launchbox-games");
    expect(findExactLaunchboxMatch(target, [{ ...game, images: [...game.images, { fileName: "other.jpg", region: "United Kingdom" }] }], game.platform).reason).toBe("ambiguous-launchbox-covers");
  });

  it("rejects US, unlabelled, and World covers for European targets", () => {
    for (const region of ["North America", "World", ""]) {
      expect(findExactLaunchboxMatch(target, [{ ...game, images: [{ fileName: "wrong.jpg", region }] }], game.platform).reason).toBe("region-mismatch");
    }
  });
});
