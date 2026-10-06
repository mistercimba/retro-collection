import type { CollectionGame, WantTarget } from "./data/types";
import { platformSlug } from "./data/platforms";
import { wishlistTargetsSatisfiedByAddedGame } from "./wishlist-auto-remove.logic";
import { isOrderedWishlistTarget } from "./wishlist-acquisition.logic";

export type CatalogLibraryBadge = "owned" | "wishlist" | "ordered";

export type CatalogLibraryState = {
  badges: CatalogLibraryBadge[];
  ownedCount: number;
  wishlistCount: number;
  orderedCount: number;
};

function normalizeTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getCatalogLibraryState(
  collection: Array<Pick<CollectionGame, "title" | "platform" | "keepStatus">>,
  wishlist: WantTarget[],
  title: string,
  platform: string,
): CatalogLibraryState {
  const wantedTitle = normalizeTitle(title);
  const wantedPlatform = platformSlug(platform);

  const ownedCount = collection.filter((game) =>
    game.keepStatus !== "Sold" &&
    normalizeTitle(game.title) === wantedTitle &&
    platformSlug(game.platform) === wantedPlatform
  ).length;

  const wishlistCount = wishlistTargetsSatisfiedByAddedGame(wishlist, title, platform).length;
  const orderedCount = wishlist.filter((target) =>
    isOrderedWishlistTarget(target) &&
    normalizeTitle(target.title) === wantedTitle &&
    platformSlug(target.platform) === wantedPlatform
  ).length;

  const badges: CatalogLibraryBadge[] = [];
  if (ownedCount > 0) badges.push("owned");
  if (orderedCount > 0) badges.push("ordered");
  if (wishlistCount > 0) badges.push("wishlist");

  return { badges, ownedCount, wishlistCount, orderedCount };
}
