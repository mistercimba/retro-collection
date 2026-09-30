import collectionManifest from "../../public/covers/manifest.json";
import artworkGames from "../../data/artwork-games.json";
import { WISHLIST_ARTWORK } from "../data/wishlist-artwork";
import { GAME_ARTWORK } from "../data/game-artwork";
import {
  createCollectionWishlistArtworkIndex,
  resolveCollectionWishlistArtworkFromIndex,
  resolveCollectionWishlistArtwork,
  resolveDedicatedWishlistArtwork,
  type WishlistArtworkGame,
  type WishlistArtworkTarget,
} from "./wishlist-artwork.logic";

export type { WishlistArtworkTarget } from "./wishlist-artwork.logic";

// Build once per module load; page requests only perform in-memory lookups.
const collectionArtworkIndex = createCollectionWishlistArtworkIndex(
  artworkGames.map((game) => ({ ...game, region: (collectionManifest.entries as Record<string, { regionName?: string }>)[game.collectionId]?.regionName })), GAME_ARTWORK,
);

export function resolveWishlistArtworkFromEntries(
  target: WishlistArtworkTarget,
  games: WishlistArtworkGame[],
  collectionArtwork: Record<string, string>,
  wishlistArtwork: Record<string, string>,
): string | null {
  return resolveDedicatedWishlistArtwork(target, wishlistArtwork) ??
    resolveCollectionWishlistArtwork(target, games, collectionArtwork);
}

export function resolveWishlistArtwork(target: WishlistArtworkTarget): string | null {
  return resolveDedicatedWishlistArtwork(target, WISHLIST_ARTWORK) ??
    resolveCollectionWishlistArtworkFromIndex(target, collectionArtworkIndex);
}
