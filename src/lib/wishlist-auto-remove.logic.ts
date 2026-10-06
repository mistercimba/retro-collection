import type { WantTarget } from "@/lib/data/types";
import { platformSlug } from "@/lib/data/platforms";

function normalizeTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
    normalizeTitle(target.title) === wantedTitle &&
    platformSlug(target.platform) === wantedPlatform
  );
}
