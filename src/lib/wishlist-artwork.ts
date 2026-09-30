import artworkGames from "../../data/artwork-games.json";
import { GAME_ARTWORK } from "@/data/game-artwork";

type ArtworkGame = {
  collectionId: string;
  title: string;
  platform: string;
};

export function normalizeWishlistArtworkKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveWishlistArtworkFromEntries(
  title: string,
  platform: string,
  games: ArtworkGame[],
  artwork: Record<string, string>,
): string | null {
  const wantedTitle = normalizeWishlistArtworkKey(title);
  const wantedPlatform = normalizeWishlistArtworkKey(platform);
  if (!wantedTitle || !wantedPlatform) return null;

  const matches = games.filter((game) =>
    normalizeWishlistArtworkKey(game.title) === wantedTitle &&
    normalizeWishlistArtworkKey(game.platform) === wantedPlatform &&
    Boolean(artwork[game.collectionId]),
  );

  if (matches.length !== 1) return null;
  return artwork[matches[0].collectionId] ?? null;
}

export function resolveWishlistArtwork(title: string, platform: string): string | null {
  return resolveWishlistArtworkFromEntries(
    title,
    platform,
    artworkGames as ArtworkGame[],
    GAME_ARTWORK,
  );
}
