import type { WishlistArtworkTarget } from "./wishlist-artwork.logic";
export function normalizeWishlistArtworkTitle(value: string): string;
export function normalizeWishlistArtworkPlatform(value: string): string;
export function wishlistArtworkRegion(targetVersion?: string): "Europe" | "US" | "Japan";
export function wishlistArtworkIdentity(target: WishlistArtworkTarget): string;
