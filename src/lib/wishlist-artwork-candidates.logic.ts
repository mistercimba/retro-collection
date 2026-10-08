import type { WantTarget, WishlistArtworkOverride } from "./data/types";
import { WISHLIST_ARTWORK_CANDIDATES, type WishlistArtworkCandidate } from "../data/wishlist-artwork-candidates";
import { WISHLIST_ARTWORK_CANDIDATE_FILES } from "../data/wishlist-artwork-candidate-files";
import {
  normalizeWishlistArtworkPlatform,
  normalizeWishlistArtworkTitle,
} from "./wishlist-artwork.logic";

type CandidateTarget = Pick<WantTarget, "title" | "platform"> & { targetVersion?: string };

export function wishlistArtworkCandidateLocalUrl(candidate: WishlistArtworkCandidate): string | null {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(candidate.id)) return null;
  return WISHLIST_ARTWORK_CANDIDATE_FILES[candidate.id] ?? null;
}

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

function defaultCandidateScore(candidate: WishlistArtworkCandidate): number {
  const label = candidate.displayRegion
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US");
  if (label === "europe") return 1000;
  if (/\beurope\b/.test(label)) return 990;
  if (/\b(united kingdom|great britain|uk)\b/.test(label)) return 950;
  if (/\bportugal\b/.test(label) && /\bspain\b/.test(label)) return 940;
  if (/\bportugal\b/.test(label)) return 930;
  if (/\bspain\b/.test(label)) return 920;
  if (/\b(france|germany|italy|ireland|netherlands|the netherlands|belgium|austria|switzerland|sweden|denmark|norway|finland)\b/.test(label)) return 900;
  if (/\b(australia|oceania)\b/.test(label)) return 800;
  if (candidate.artworkRegion === "Europe") return 700;
  if (candidate.artworkRegion === "US") return 100;
  return 0;
}

export function resolvePreferredWishlistArtworkCandidate(target: CandidateTarget): WishlistArtworkCandidate | null {
  const candidates = resolveWishlistArtworkCandidates(target);
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) =>
    defaultCandidateScore(b) - defaultCandidateScore(a) ||
    a.displayRegion.localeCompare(b.displayRegion, "en-US") ||
    a.id.localeCompare(b.id)
  )[0] ?? null;
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
