import artworkGames from "../../data/artwork-games.json";
import { WISHLIST_ARTWORK } from "../data/wishlist-artwork";
import { GAME_ARTWORK } from "../data/game-artwork";
import {
  resolveCollectionWishlistArtwork,
  resolveDedicatedWishlistArtwork,
  type WishlistArtworkGame,
  type WishlistArtworkTarget,
} from "./wishlist-artwork.logic";

export type { WishlistArtworkTarget } from "./wishlist-artwork.logic";

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
  return resolveWishlistArtworkFromEntries(
    target,
    artworkGames as WishlistArtworkGame[],
    GAME_ARTWORK,
    WISHLIST_ARTWORK,
  );
}
