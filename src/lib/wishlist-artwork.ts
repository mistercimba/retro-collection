import collectionManifest from "../../public/covers/manifest.json";
import artworkGames from "../../data/artwork-games.json";
import { WISHLIST_ARTWORK } from "../data/wishlist-artwork";
import { GAME_ARTWORK } from "../data/game-artwork";
import type { CanonicalGameIdentity, WishlistArtworkOverride } from "./data/types";
import { resolveWishlistArtworkOverrideCandidate } from "./wishlist-artwork-candidates.logic";
import { wishlistCatalogArtworkCompatible } from "./wishlist-catalog-artwork.logic";
import {
  createCollectionWishlistArtworkIndex,
  resolveCollectionWishlistArtworkFromIndex,
  resolveCollectionWishlistArtwork,
  resolveDedicatedWishlistArtwork,
  type WishlistArtworkGame,
  type WishlistArtworkTarget,
} from "./wishlist-artwork.logic";

export type { WishlistArtworkTarget } from "./wishlist-artwork.logic";

type WishlistArtworkWithCatalog = WishlistArtworkTarget & {
  catalog?: CanonicalGameIdentity;
  artworkOverride?: WishlistArtworkOverride | null;
};

function manualArtworkUrl(target: WishlistArtworkWithCatalog): string | null {
  if (!target.artworkOverride?.pathname) return null;
  if (!resolveWishlistArtworkOverrideCandidate(target)) return null;
  const params = new URLSearchParams({ platform: target.platform, title: target.title });
  return `/api/wishlist-artwork-override/${encodeURIComponent(target.targetId)}?${params.toString()}`;
}

function catalogArtworkUrl(target: WishlistArtworkWithCatalog): string | null {
  if (!target.catalog?.artwork?.pathname) return null;
  if (!wishlistCatalogArtworkCompatible(target.targetVersion, target.catalog.edition)) return null;
  const params = new URLSearchParams({ platform: target.platform, title: target.title });
  return `/api/catalog-artwork/wishlist/${encodeURIComponent(target.targetId)}?${params.toString()}`;
}

// Build once per module load; page requests only perform in-memory lookups.
const collectionArtworkIndex = createCollectionWishlistArtworkIndex(
  artworkGames.map((game) => ({ ...game, region: (collectionManifest.entries as Record<string, { regionName?: string; coverVariant?: string }>)[game.collectionId]?.regionName, coverVariant: (collectionManifest.entries as Record<string, { coverVariant?: string }>)[game.collectionId]?.coverVariant })), GAME_ARTWORK,
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

export function resolveWishlistArtwork(target: WishlistArtworkWithCatalog): string | null {
  return manualArtworkUrl(target) ??
    resolveDedicatedWishlistArtwork(target, WISHLIST_ARTWORK) ??
    resolveCollectionWishlistArtworkFromIndex(target, collectionArtworkIndex) ??
    catalogArtworkUrl(target);
}

