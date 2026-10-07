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
  it("offers both known PAL Final Fantasy VIII candidates independently of targetId", () => {
    const candidates = resolveWishlistArtworkCandidates(target({ targetId: "APP-whatever" }));
    expect(candidates.map((item) => item.displayRegion)).toEqual(["Europe / Australia", "Spain"]);
  });

  it("prefers Europe / Australia as the default when it is one of several options", () => {
    expect(resolvePreferredWishlistArtworkCandidate(target())?.displayRegion).toBe("Europe / Australia");
  });

  it("serves candidate artwork from an app-owned path instead of the remote source URL", () => {
    const preferred = resolvePreferredWishlistArtworkCandidate(target());
    expect(preferred).toBeTruthy();
    expect(wishlistArtworkCandidateLocalUrl(preferred!)).toMatch(/^\/covers\/wishlist-candidates\//);
    expect(wishlistArtworkCandidateLocalUrl(preferred!)).not.toContain("http");
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
