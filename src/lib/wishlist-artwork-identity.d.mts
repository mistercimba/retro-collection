import type { WishlistArtworkTarget } from "./wishlist-artwork.logic";
import type { WantlistVariant } from "./wantlist-facets.logic";
export function wishlistArtworkEditionRequirement(targetVersion?: string): Exclude<WantlistVariant, "Other"> | "Any" | "Unknown";
export function normalizeWishlistArtworkTitle(value: string): string;
export function normalizeWishlistArtworkPlatform(value: string): string;
export function wishlistArtworkRegion(targetVersion?: string): "Europe" | "US" | "Japan";
export function wishlistArtworkIdentity(target: WishlistArtworkTarget): string;
