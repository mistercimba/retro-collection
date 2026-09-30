import { normalizeWantlistVariant } from "./wantlist-facets.logic";
import { normalizeWishlistArtworkTitle, normalizeWishlistArtworkPlatform, wishlistArtworkRegion, wishlistArtworkIdentity, wishlistArtworkEditionRequirement } from "./wishlist-artwork-identity.mjs";
export { normalizeWishlistArtworkTitle, normalizeWishlistArtworkPlatform, wishlistArtworkRegion, wishlistArtworkIdentity, wishlistArtworkEditionRequirement } from "./wishlist-artwork-identity.mjs";
import { collectionWishlistArtworkRegion } from "./wishlist-artwork-region.mjs";

export { collectionWishlistArtworkRegion } from "./wishlist-artwork-region.mjs";

export type WishlistArtworkTarget = {
  targetId: string;
  title: string;
  platform: string;
  targetVersion?: string;
};

export type WishlistArtworkGame = {
  collectionId: string;
  title: string;
  platform: string;
  region?: string;
  coverVariant?: string;
};

export type CollectionWishlistArtworkIndex = Map<string, string | null>;

export function resolveDedicatedWishlistArtwork(
  target: WishlistArtworkTarget,
  artwork: Record<string, string>,
): string | null {
  if (wishlistArtworkEditionRequirement(target.targetVersion) === "Unknown") return null;
  return artwork[wishlistArtworkIdentity(target)] ?? null;
}

export function resolveCollectionWishlistArtwork(
  target: WishlistArtworkTarget,
  games: WishlistArtworkGame[],
  artwork: Record<string, string>,
): string | null {
  return resolveCollectionWishlistArtworkFromIndex(target, createCollectionWishlistArtworkIndex(games, artwork));
}

function collectionArtworkKey(title: string, platform: string, region: string, variant: string): string {
  return JSON.stringify([normalizeWishlistArtworkPlatform(platform), normalizeWishlistArtworkTitle(title), region, variant]);
}

export function createCollectionWishlistArtworkIndex(
  games: WishlistArtworkGame[],
  artwork: Record<string, string>,
): CollectionWishlistArtworkIndex {
  const index: CollectionWishlistArtworkIndex = new Map();
  for (const game of games) {
    const region = collectionWishlistArtworkRegion(game.region);
    const file = artwork[game.collectionId];
    const variant = normalizeWantlistVariant(game.coverVariant ?? "");
    if (!region || !file || !normalizeWishlistArtworkTitle(game.title) || !normalizeWishlistArtworkPlatform(game.platform)) continue;
    for (const requirement of variant === "Other" ? ["Any"] : ["Any", variant]) {
      const key = collectionArtworkKey(game.title, game.platform, region, requirement);
      index.set(key, index.has(key) ? null : file);
    }
  }
  return index;
}

export function resolveCollectionWishlistArtworkFromIndex(
  target: WishlistArtworkTarget,
  index: CollectionWishlistArtworkIndex,
): string | null {
  const variant = wishlistArtworkEditionRequirement(target.targetVersion);
  if (variant === "Unknown") return null;
  return index.get(collectionArtworkKey(target.title, target.platform, wishlistArtworkRegion(target.targetVersion), variant)) ?? null;
}
