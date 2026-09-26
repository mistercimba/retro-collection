import { displayPlatform } from "@/lib/data/platforms";

type WikiPage = {
  index?: number;
  title?: string;
  thumbnail?: { source?: string; width?: number; height?: number };
  original?: { source?: string; width?: number; height?: number };
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

function normalise(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pageImage(page?: WikiPage | null) {
  return page?.thumbnail?.source || page?.original?.source || null;
}

async function fetchWiki(params: URLSearchParams): Promise<WikiResponse> {
  const response = await fetch(`${WIKI_API}?${params.toString()}`, {
    headers: {
      "User-Agent": "MarioRetroCollection/1.0 (personal collection browser)",
      Accept: "application/json",
    },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!response.ok) throw new Error(`Wikipedia API returned ${response.status}`);
  return (await response.json()) as WikiResponse;
}

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
  const payload = await fetchWiki(params);
  return pageImage(payload.query?.pages?.[0]);
}

function gameCandidateScore(candidate: WikiPage, requestedTitle: string) {
  const candidateTitle = normalise(candidate.title ?? "");
  const requested = normalise(requestedTitle);
  if (!candidateTitle || !requested) return -1000;

  const bad = ["film", "album", "soundtrack", "novel", "tv series", "television", "song"];
  if (bad.some((term) => candidateTitle.includes(term))) return -500;

  let score = -(candidate.index ?? 99) * 2;
  if (candidateTitle === requested) score += 100;
  if (candidateTitle.startsWith(requested)) score += 70;
  if (candidateTitle.includes(requested)) score += 40;

  const requestedWords = new Set(requested.split(" "));
  const candidateWords = new Set(candidateTitle.split(" "));
  for (const word of requestedWords) if (candidateWords.has(word)) score += 3;

  if (candidate.thumbnail || candidate.original) score += 20;
  return score;
}

export async function resolveGameArtwork(title: string, platform: string): Promise<string | null> {
  const display = displayPlatform(platform);
  const search = `"${title}" video game ${display}`;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: search,
    gsrnamespace: "0",
    gsrlimit: "8",
    prop: "pageimages",
    piprop: "thumbnail|original",
    pithumbsize: "700",
    pilicense: "any",
  });
  const payload = await fetchWiki(params);
  const candidates = (payload.query?.pages ?? [])
    .filter((page) => pageImage(page))
    .sort((a, b) => gameCandidateScore(b, title) - gameCandidateScore(a, title));

  return pageImage(candidates[0]);
}
