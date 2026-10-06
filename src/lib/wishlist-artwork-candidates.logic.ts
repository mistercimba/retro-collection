import type { WantTarget, WishlistArtworkOverride } from "./data/types";
import { WISHLIST_ARTWORK_CANDIDATES, type WishlistArtworkCandidate } from "../data/wishlist-artwork-candidates";
import {
  normalizeWishlistArtworkPlatform,
  normalizeWishlistArtworkTitle,
} from "./wishlist-artwork.logic";

type CandidateTarget = Pick<WantTarget, "title" | "platform"> & { targetVersion?: string };

export function resolveWishlistArtworkCandidates(target: CandidateTarget): WishlistArtworkCandidate[] {
  const title = normalizeWishlistArtworkTitle(target.title);
  const platform = normalizeWishlistArtworkPlatform(target.platform);

  // This is a manual resolver, not an automatic matcher. Once the pipeline has
  // recorded multiple plausible covers for the same game/platform, expose all
  // of them and let the user make the final call from the visual/provenance
  // context. Region/edition heuristics remain useful labels, but they must not
  // hide the chooser itself.
  return WISHLIST_ARTWORK_CANDIDATES.filter((candidate) =>
    normalizeWishlistArtworkTitle(candidate.title) === title &&
    normalizeWishlistArtworkPlatform(candidate.platform) === platform
  );
}

export function wishlistArtworkCandidateById(
  target: CandidateTarget,
  candidateId: string,
): WishlistArtworkCandidate | null {
  return resolveWishlistArtworkCandidates(target).find((candidate) => candidate.id === candidateId) ?? null;
}

export function resolveWishlistArtworkOverrideCandidate(
  target: CandidateTarget & { artworkOverride?: WishlistArtworkOverride | null },
): WishlistArtworkCandidate | null {
  const override = target.artworkOverride;
  if (!override) return null;
  const candidate = wishlistArtworkCandidateById(target, override.candidateId);
  if (!candidate) return null;
  return candidate.sourcePath === override.sourcePath ? candidate : null;
}
