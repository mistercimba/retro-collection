import type { WantTarget, WishlistArtworkOverride } from "./data/types";
import { WISHLIST_ARTWORK_CANDIDATES, type WishlistArtworkCandidate } from "../data/wishlist-artwork-candidates";
import {
  normalizeWishlistArtworkPlatform,
  normalizeWishlistArtworkTitle,
  wishlistArtworkRegion,
  wishlistArtworkEditionRequirement,
} from "./wishlist-artwork.logic";
import { normalizeWantlistVariant } from "./wantlist-facets.logic";

type CandidateTarget = Pick<WantTarget, "title" | "platform"> & { targetVersion?: string };

export function resolveWishlistArtworkCandidates(target: CandidateTarget): WishlistArtworkCandidate[] {
  const requirement = wishlistArtworkEditionRequirement(target.targetVersion);

  const title = normalizeWishlistArtworkTitle(target.title);
  const platform = normalizeWishlistArtworkPlatform(target.platform);
  const region = wishlistArtworkRegion(target.targetVersion);

  return WISHLIST_ARTWORK_CANDIDATES.filter((candidate) => {
    if (normalizeWishlistArtworkTitle(candidate.title) !== title) return false;
    if (normalizeWishlistArtworkPlatform(candidate.platform) !== platform) return false;
    if (candidate.artworkRegion !== region) return false;
    if (requirement === "Any" || requirement === "Unknown") return true;
    return normalizeWantlistVariant(candidate.coverVariant) === requirement;
  });
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
