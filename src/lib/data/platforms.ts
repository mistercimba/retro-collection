const PLATFORM_SLUGS: Record<string, string> = {
  NES: "nes",
  SNES: "snes",
  "Nintendo 64": "n64",
  GameCube: "gamecube",
  "Nintendo Wii": "wii",
  "Nintendo Wii U": "wii-u",
  "Nintendo Switch": "switch",
  "GameBoy + Color": "game-boy-color",
  "Game Boy": "game-boy",
  "Game Boy Color": "game-boy-color",
  "GameBoy Advance": "gba",
  "Nintendo DS": "ds",
  "Nintendo 3DS": "3ds",
  Playstation: "ps1",
  "Playstation 2": "ps2",
  "Playstation 3": "ps3",
  "Playstation 5": "ps5",
  PSP: "psp",
  PC: "pc",
  Miscellaneous: "misc",
};

const PLATFORM_RELEASE_YEARS: Record<string, number> = {
  PC: 1981,
  NES: 1983,
  "Game Boy": 1989,
  SNES: 1990,
  Playstation: 1994,
  "Nintendo 64": 1996,
  "Game Boy Color": 1998,
  "Playstation 2": 2000,
  "GameBoy Advance": 2001,
  GameCube: 2001,
  "Nintendo DS": 2004,
  PSP: 2004,
  "Nintendo Wii": 2006,
  "Playstation 3": 2006,
  "Nintendo 3DS": 2011,
  "Nintendo Wii U": 2012,
  "Nintendo Switch": 2017,
  "Playstation 5": 2020,
  Miscellaneous: 9999,
};

export function platformSlug(platform: string): string {
  return PLATFORM_SLUGS[platform] ?? platform.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function platformFromSlug(slug: string, platforms: string[]): string | null {
  return platforms.find((platform) => platformSlug(platform) === slug) ?? null;
}

export function displayPlatform(platform: string): string {
  const labels: Record<string, string> = {
    Playstation: "PlayStation",
    "Playstation 2": "PlayStation 2",
    "Playstation 3": "PlayStation 3",
    "Playstation 5": "PlayStation 5",
    "GameBoy + Color": "Game Boy / Color",
    "Game Boy": "Game Boy",
    "Game Boy Color": "Game Boy Color",
    "GameBoy Advance": "Game Boy Advance",
  };
  return labels[platform] ?? platform;
}

export function platformReleaseYear(platform: string): number {
  return PLATFORM_RELEASE_YEARS[platform] ?? 9998;
}

export function sortPlatformsByRelease<T extends { platform: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    platformReleaseYear(a.platform) - platformReleaseYear(b.platform) ||
    displayPlatform(a.platform).localeCompare(displayPlatform(b.platform), "pt-PT"),
  );
}
