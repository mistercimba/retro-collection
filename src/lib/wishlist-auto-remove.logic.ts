import type { WantTarget } from "./data/types";
import { platformSlug } from "./data/platforms";
import { isOrderedWishlistTarget } from "./wishlist-acquisition.logic";

function normalizeTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isInactiveTarget(status: string) {
  const normalized = normalizeTitle(status).toUpperCase();
  return /^(FORA DA BUYLIST|INATIVO|PAUSADO|CANCELADO|REMOVIDO|ADQUIRIDO|COMPRADO)( |$)/.test(normalized);
}

export function wishlistTargetsSatisfiedByAddedGame(
  wishlist: WantTarget[],
  title: string,
  platform: string,
): WantTarget[] {
  const wantedTitle = normalizeTitle(title);
  const wantedPlatform = platformSlug(platform);
  if (!wantedTitle || !wantedPlatform) return [];

  return wishlist.filter((target) =>
    !isOrderedWishlistTarget(target) &&
    !isInactiveTarget(target.status) &&
    normalizeTitle(target.title) === wantedTitle &&
    platformSlug(target.platform) === wantedPlatform
  );
}
