const PLATFORM_SLUGS: Record<string, string> = {
  NES: "nes",
  SNES: "snes",
  "Nintendo 64": "n64",
  GameCube: "gamecube",
  "Nintendo Wii": "wii",
  "Nintendo Wii U": "wii-u",
  "Nintendo Switch": "switch",
  "GameBoy + Color": "game-boy-color",
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
    "GameBoy Advance": "Game Boy Advance",
  };
  return labels[platform] ?? platform;
}
