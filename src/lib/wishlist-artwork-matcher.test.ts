import { describe, expect, it } from "vitest";
import { findExactSourceMatches, normalizeArtworkTitle, requestedArtworkRegion, sourceArtworkRegion, sourceArtworkTitle } from "../../scripts/wishlist-artwork-matcher.mjs";

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
});
