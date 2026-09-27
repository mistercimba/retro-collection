import { displayPlatform } from "./data/platforms";

type WikiPage = {
  thumbnail?: { source?: string };
  original?: { source?: string };
};

type WikiResponse = {
  query?: {
    pages?: WikiPage[];
  };
};

const PLATFORM_PAGES: Record<string, string> = {
  NES: "Nintendo Entertainment System",
  SNES: "Super Nintendo Entertainment System",
  "Nintendo 64": "Nintendo 64",
  GameCube: "GameCube",
  "Nintendo Wii": "Wii",
  "Nintendo Wii U": "Wii U",
  "Nintendo Switch": "Nintendo Switch",
  "Game Boy": "Game Boy",
  "Game Boy Color": "Game Boy Color",
  "GameBoy + Color": "Game Boy",
  "GameBoy Advance": "Game Boy Advance",
  "Nintendo DS": "Nintendo DS",
  "Nintendo 3DS": "Nintendo 3DS",
  Playstation: "PlayStation (console)",
  "Playstation 2": "PlayStation 2",
  "Playstation 3": "PlayStation 3",
  "Playstation 5": "PlayStation 5",
  PSP: "PlayStation Portable",
  PC: "Personal computer",
  Miscellaneous: "Video game console",
};

const WIKI_API = "https://en.wikipedia.org/w/api.php";

export async function resolvePlatformArtwork(platform: string): Promise<string | null> {
  const title = PLATFORM_PAGES[platform] ?? displayPlatform(platform);
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    prop: "pageimages",
    piprop: "thumbnail|original",
    pithumbsize: "1000",
    pilicense: "any",
    titles: title,
  });

  const response = await fetch(`${WIKI_API}?${params.toString()}`, {
    headers: {
      "User-Agent": "MarioRetroCollection/1.0 (personal collection browser)",
      Accept: "application/json",
    },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });

  if (!response.ok) throw new Error(`Wikipedia API returned ${response.status}`);
  const payload = (await response.json()) as WikiResponse;
  const page = payload.query?.pages?.[0];
  return page?.thumbnail?.source || page?.original?.source || null;
}
