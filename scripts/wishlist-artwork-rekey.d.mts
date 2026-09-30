import type { WishlistArtworkTarget } from "../src/lib/wishlist-artwork.logic";
export type ExistingArtwork = WishlistArtworkTarget & { file: string; coverVariant?: string; imageSha256?: string };
export function rekeyWishlistArtwork(targets: WishlistArtworkTarget[], entries: Record<string, ExistingArtwork>): {
  entries: Record<string, ExistingArtwork>; unassignedEntries: Record<string, ExistingArtwork>; missing: { target: WishlistArtworkTarget; reason: string }[];
};
