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
};

const PLATFORM_ALIASES: Record<string, string> = {
  nes: "nes", "nintendo entertainment system": "nes",
  snes: "snes", "super nintendo": "snes", "super nintendo entertainment system": "snes",
  n64: "nintendo 64", "nintendo 64": "nintendo 64",
  gameboy: "game boy", "game boy": "game boy", "nintendo game boy": "game boy",
  "game boy color": "game boy color", "gameboy color": "game boy color", "nintendo game boy color": "game boy color",
  gba: "game boy advance", "gameboy advance": "game boy advance", "game boy advance": "game boy advance", "nintendo game boy advance": "game boy advance",
  gamecube: "gamecube", "nintendo gamecube": "gamecube",
  ds: "nintendo ds", "nintendo ds": "nintendo ds",
  "3ds": "nintendo 3ds", "nintendo 3ds": "nintendo 3ds",
  wii: "nintendo wii", "nintendo wii": "nintendo wii",
  "wii u": "nintendo wii u", "nintendo wii u": "nintendo wii u",
  switch: "nintendo switch", "nintendo switch": "nintendo switch",
  ps1: "playstation", playstation: "playstation", "sony playstation": "playstation",
  ps2: "playstation 2", "playstation 2": "playstation 2", "sony playstation 2": "playstation 2",
  ps3: "playstation 3", "playstation 3": "playstation 3", "sony playstation 3": "playstation 3",
  ps5: "playstation 5", "playstation 5": "playstation 5", "sony playstation 5": "playstation 5",
};

export function normalizeWishlistArtworkTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an)\s+/, "");
}

export function normalizeWishlistArtworkPlatform(value: string): string {
  const normalized = normalizeWishlistArtworkTitle(value);
  return PLATFORM_ALIASES[normalized] ?? normalized;
}

export function wishlistArtworkRegion(targetVersion = ""): "Europe" | "US" | "Japan" {
  const normalized = normalizeWishlistArtworkTitle(targetVersion);
  if (/\b(ntsc j|japan|japanese|japao|japones|jp)\b/.test(normalized)) return "Japan";
  if (/\b(ntsc u|usa|united states|north american|north america|norte americano|us)\b/.test(normalized)) return "US";
  return "Europe";
}

export function wishlistArtworkIdentity(target: WishlistArtworkTarget): string {
  return JSON.stringify([
    target.targetId,
    normalizeWishlistArtworkPlatform(target.platform),
    normalizeWishlistArtworkTitle(target.title),
    wishlistArtworkRegion(target.targetVersion),
  ]);
}

export function resolveDedicatedWishlistArtwork(
  target: WishlistArtworkTarget,
  artwork: Record<string, string>,
): string | null {
  return artwork[wishlistArtworkIdentity(target)] ?? null;
}

export function resolveCollectionWishlistArtwork(
  target: WishlistArtworkTarget,
  games: WishlistArtworkGame[],
  artwork: Record<string, string>,
): string | null {
  const title = normalizeWishlistArtworkTitle(target.title);
  const platform = normalizeWishlistArtworkPlatform(target.platform);
  if (!title || !platform) return null;

  const matches = games.filter((game) =>
    normalizeWishlistArtworkTitle(game.title) === title &&
    normalizeWishlistArtworkPlatform(game.platform) === platform &&
    Boolean(artwork[game.collectionId]),
  );

  return matches.length === 1 ? artwork[matches[0].collectionId] ?? null : null;
}
