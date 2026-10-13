import { describe, expect, it } from "vitest";
import type { WantTarget } from "./data/types";
import {
  resolvePreferredWishlistArtworkCandidate,
  resolveWishlistArtworkCandidates,
  resolveWishlistArtworkOverrideCandidate,
  wishlistArtworkCandidateLocalUrl,
} from "./wishlist-artwork-candidates.logic";

function target(overrides: Partial<WantTarget> = {}): WantTarget {
  return {
    platform: "Playstation",
    priority: "Média",
    targetId: "APP-123",
    title: "Final Fantasy VIII",
    reason: "",
    targetVersion: "PAL; CIB",
    priceCeilingEur: null,
    status: "ACTIVE",
    notes: "",
    ...overrides,
  };
}

describe("wishlist artwork candidates", () => {
  it("resolves all six new post-cleanup targets to committed European PAL fronts", () => {
    const splitTitles = [
      { title: "Pokémon Black Version 2", platform: "Nintendo DS", source: "curated", age: 3 },
      { title: "Pokémon White Version 2", platform: "Nintendo DS", source: "curated", age: 3 },
      { title: "Pokémon Ultra Sun", platform: "Nintendo 3DS", source: "libretro-thumbnails", age: 7 },
      { title: "Pokémon Ultra Moon", platform: "Nintendo 3DS", source: "libretro-thumbnails", age: 7 },
      { title: "Fire Emblem Fates: Birthright", platform: "Nintendo 3DS", source: "libretro-thumbnails", age: 12 },
      { title: "Fire Emblem Fates: Conquest", platform: "Nintendo 3DS", source: "libretro-thumbnails", age: 12 },
    ] as const;
    const usedIds = new Set<string>();
    for (const item of splitTitles) {
      const exact = target({
        targetId: "NOVO", title: item.title, platform: item.platform,
        targetVersion: "PAL; CIB",
      });
      const preferred = resolvePreferredWishlistArtworkCandidate(exact);
      expect(preferred, item.title).toBeTruthy();
      expect(preferred?.title).toBe(item.title);
      expect(preferred?.platform).toBe(item.platform);
      expect(preferred?.source).toBe(item.source);
      expect(preferred?.artworkRegion).toBe("Europe");
      expect(preferred?.displayRegion).toBe("Europe");
      expect(usedIds.has(preferred!.id)).toBe(false);
      usedIds.add(preferred!.id);
      const local = wishlistArtworkCandidateLocalUrl(preferred!);
      expect(local).toMatch(/^\/covers\/wishlist-candidates\/[^/]+\.(png|jpg)$/);
      expect(local).not.toContain("http");
      if (item.platform === "Nintendo DS") {
        expect(preferred?.metadataUrl).toContain("pokemondungeon.com");
        expect(preferred?.sourcePath).toContain("_front_cover_eu-");
      } else {
        expect(preferred?.sourceRepo).toBe("libretro-thumbnails/Nintendo_-_Nintendo_3DS");
        expect(preferred?.sourcePath).toContain("(Europe)");
        expect(preferred?.sourcePath).not.toContain("(USA)");
      }
    }
    expect(usedIds.size).toBe(6);
  });

  it("offers both known PAL Final Fantasy VIII candidates independently of targetId", () => {
    const candidates = resolveWishlistArtworkCandidates(target({ targetId: "APP-whatever" }));
    expect(candidates.map((item) => item.displayRegion)).toEqual(["Europe / Australia", "Spain"]);
  });

  it("prefers the most general European cover before country-specific PAL covers", () => {
    expect(resolvePreferredWishlistArtworkCandidate(target())?.displayRegion).toBe("Europe / Australia");
  });

  it("serves candidate artwork from an app-owned path instead of the remote source URL", () => {
    const preferred = resolvePreferredWishlistArtworkCandidate(target());
    expect(preferred).toBeTruthy();
    expect(wishlistArtworkCandidateLocalUrl(preferred!)).toMatch(/^\/covers\/wishlist-candidates\//);
    expect(wishlistArtworkCandidateLocalUrl(preferred!)).not.toContain("http");
  });

  it("preserves approved SNES European artwork after exact Wishlist title corrections", () => {
    const titles = [
      ["Teenage Mutant Hero Turtles: Turtles in Time", "Teenage Mutant Hero Turtles IV: Turtles in Time"],
      ["Yoshi's Island / Super Mario World 2", "Super Mario World 2: Yoshi's Island"],
    ];
    for (const [before, after] of titles) {
      const original = resolvePreferredWishlistArtworkCandidate(target({ platform: "SNES", title: before }));
      const renamed = resolvePreferredWishlistArtworkCandidate(target({ platform: "SNES", title: after }));
      expect(original).toBeTruthy();
      expect(renamed?.id).toBe(original?.id);
      expect(wishlistArtworkCandidateLocalUrl(renamed!)).toContain("/covers/wishlist-candidates/");
    }
    expect(resolveWishlistArtworkCandidates(target({ platform: "SNES", title: "Some Other Title" }))).toEqual([]);
  });

  it("collapses duplicate regional labels that point to the same DuckTales 2 image", () => {
    const duck = {
      ...target(),
      targetId: "APP-DT2",
      title: "DuckTales 2",
      platform: "NES",
      targetVersion: "PAL; loose",
    };
    expect(resolveWishlistArtworkCandidates(duck)).toHaveLength(1);
    expect(resolvePreferredWishlistArtworkCandidate(duck)?.displayRegion).toBe("Europe");
  });

  it("still offers candidates when the target version text is unrecognized so the user can resolve visually", () => {
    expect(resolveWishlistArtworkCandidates(target({ targetVersion: "PAL edição a confirmar; CIB" }))).toHaveLength(2);
  });

  it("keeps manual candidates visible even when target metadata says a different edition", () => {
    expect(resolveWishlistArtworkCandidates(target({ targetVersion: "PAL Platinum; CIB" }))).toHaveLength(2);
  });

  it("keeps a manual override authoritative for the exact title/platform target", () => {
    const spain = resolveWishlistArtworkCandidates(target()).find((candidate) => candidate.displayRegion === "Spain");
    expect(spain).toBeTruthy();
    const override = {
      candidateId: spain!.id,
      pathname: "retro-collection/wishlist-artwork-overrides/APP-123/manual.png",
      contentType: "image/png",
      source: spain!.source,
      sourceRepo: spain!.sourceRepo,
      sourceCommit: spain!.sourceCommit,
      sourcePath: spain!.sourcePath,
      selectedAt: "2026-10-06T22:00:00.000Z",
    };
    expect(resolveWishlistArtworkOverrideCandidate(target({ artworkOverride: override }))?.id).toBe(spain!.id);
    expect(resolveWishlistArtworkOverrideCandidate(target({ targetVersion: "PAL Platinum", artworkOverride: override }))?.id).toBe(spain!.id);
  });
});
