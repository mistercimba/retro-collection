import { displayPlatform } from "@/lib/data/platforms";

type WikiPage = {
  index?: number;
  pageid?: number;
  title?: string;
  thumbnail?: { source?: string; width?: number; height?: number };
  original?: { source?: string; width?: number; height?: number };
};

type WikiResponse = {
  query?: {
    pages?: WikiPage[];
  };
};

type CommonsImageInfo = {
  thumburl?: string;
  url?: string;
  descriptionurl?: string;
  extmetadata?: Record<string, { value?: string }>;
};

type CommonsPage = {
  index?: number;
  pageid?: number;
  title?: string;
  imageinfo?: CommonsImageInfo[];
};

type CommonsResponse = {
  query?: {
    pages?: CommonsPage[];
  };
};

export type GameArtworkRequest = {
  title: string;
  platform: string;
  region?: string;
  edition?: string;
  productCode?: string;
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

const PLATFORM_ALIASES: Record<string, string[]> = {
  NES: ["nes", "nintendo entertainment system", "famicom"],
  SNES: ["snes", "super nintendo", "super nintendo entertainment system", "super famicom"],
  "Nintendo 64": ["nintendo 64", "n64"],
  GameCube: ["gamecube", "nintendo gamecube", "ngc"],
  "Nintendo Wii": ["wii", "nintendo wii"],
  "Nintendo Wii U": ["wii u", "nintendo wii u"],
  "Nintendo Switch": ["nintendo switch", "switch"],
  "Game Boy": ["game boy", "gameboy", "dmg"],
  "Game Boy Color": ["game boy color", "gameboy color", "gbc", "cgb"],
  "GameBoy + Color": ["game boy", "gameboy", "game boy color", "gbc", "dmg", "cgb"],
  "GameBoy Advance": ["game boy advance", "gameboy advance", "gba", "agb"],
  "Nintendo DS": ["nintendo ds", "nds"],
  "Nintendo 3DS": ["nintendo 3ds", "3ds"],
  Playstation: ["playstation", "playstation 1", "ps1", "psx", "sles", "sces"],
  "Playstation 2": ["playstation 2", "ps2", "sles", "sces"],
  "Playstation 3": ["playstation 3", "ps3", "bles", "bces"],
  "Playstation 5": ["playstation 5", "ps5"],
  PSP: ["playstation portable", "psp", "ules", "uces"],
};

const MEDIA_TERMS = [
  "cover",
  "box",
  "boxart",
  "box art",
  "case",
  "front",
  "cartridge",
  "cart",
  "label",
  "disc",
  "disk",
  "umd",
];

const PAL_TERMS = [
  " pal ",
  " europe ",
  " european ",
  " eur ",
  " uk ",
  " united kingdom ",
  " ukv ",
  " noe ",
  " germany ",
  " german ",
  " france ",
  " french ",
  " spain ",
  " spanish ",
  " italy ",
  " italian ",
  " australia ",
  " australian ",
  " aus ",
  " portugal ",
  " portuguese ",
  " gps ",
  " sles ",
  " sces ",
  " bles ",
  " bces ",
  " ules ",
  " uces ",
];

const NON_PAL_TERMS = [
  " ntsc ",
  " usa ",
  " united states ",
  " north america ",
  " american ",
  " japan ",
  " japanese ",
  " ntsc j ",
  " ntsc u ",
  " slus ",
  " scus ",
  " slps ",
  " slpm ",
  " blus ",
  " bcus ",
  " ulus ",
  " ucus ",
];

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

export function normaliseArtworkText(value: string) {
  return ` ${value
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function pageImage(page?: WikiPage | null) {
  return page?.thumbnail?.source || page?.original?.source || null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MarioRetroCollection/1.0 (personal collection browser)",
      Accept: "application/json",
    },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!response.ok) throw new Error(`Artwork source returned ${response.status}`);
  return (await response.json()) as T;
}

async function fetchWiki(params: URLSearchParams): Promise<WikiResponse> {
  return fetchJson<WikiResponse>(`${WIKI_API}?${params.toString()}`);
}

async function fetchCommons(params: URLSearchParams): Promise<CommonsResponse> {
  return fetchJson<CommonsResponse>(`${COMMONS_API}?${params.toString()}`);
}

export async function resolvePlatformArtwork(platform: string): Promise<string | null> {
  const title = PLATFORM_PAGES[platform] ?? displayPlatform(platform);
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    origin: "*",
    prop: "pageimages",
    piprop: "thumbnail|original",
    pithumbsize: "1000",
    pilicense: "any",
    titles: title,
  });
  const payload = await fetchWiki(params);
  return pageImage(payload.query?.pages?.[0]);
}

function metadataText(page: CommonsPage) {
  const info = page.imageinfo?.[0];
  const metadata = Object.values(info?.extmetadata ?? {})
    .map((entry) => entry.value ?? "")
    .join(" ");
  return normaliseArtworkText(`${page.title ?? ""} ${metadata}`);
}

function hasAny(blob: string, terms: string[]) {
  return terms.some((term) => blob.includes(term));
}

function titleCoverage(blob: string, requestedTitle: string) {
  const requested = normaliseArtworkText(requestedTitle).trim().split(" ").filter((word) => word.length > 1);
  if (!requested.length) return 0;
  const hits = requested.filter((word) => blob.includes(` ${word} `) || blob.includes(` ${word}`)).length;
  return hits / requested.length;
}

function productCodeTokens(productCode?: string) {
  if (!productCode) return [];
  return productCode
    .split(/[\/;,]+/)
    .map((code) => normaliseArtworkText(code).trim())
    .filter(Boolean);
}

export function scorePalArtworkCandidate(page: CommonsPage, request: GameArtworkRequest) {
  const blob = metadataText(page);
  const aliases = PLATFORM_ALIASES[request.platform] ?? [displayPlatform(request.platform).toLocaleLowerCase("en-US")];
  const coverage = titleCoverage(blob, request.title);
  if (coverage < 0.6) return -1000;

  const hasPlatform = hasAny(blob, aliases.map((alias) => ` ${normaliseArtworkText(alias).trim()} `));
  const codes = productCodeTokens(request.productCode);
  const hasProductCode = codes.some((code) => blob.includes(` ${code} `) || blob.includes(code));

  const hasPalEvidence = hasAny(blob, PAL_TERMS) || hasProductCode;
  const hasNonPalEvidence = hasAny(blob, NON_PAL_TERMS);
  const hasMediaEvidence = hasAny(blob, MEDIA_TERMS.map((term) => ` ${term} `));

  if (hasNonPalEvidence && !hasPalEvidence) return -1000;
  if (!hasPalEvidence) return -1000;
  if (!hasPlatform && !hasProductCode) return -1000;
  if (!hasMediaEvidence) return -1000;

  let score = Math.round(coverage * 120);
  if (coverage === 1) score += 80;
  if (hasPlatform) score += 100;
  if (hasProductCode) score += 220;
  if (hasPalEvidence) score += 180;
  if (hasMediaEvidence) score += 40;
  if (hasNonPalEvidence) score -= 250;

  const edition = normaliseArtworkText(request.edition ?? "").trim();
  if (edition && edition !== "standard" && blob.includes(` ${edition} `)) score += 40;

  score -= (page.index ?? 20) * 2;
  return score;
}

function commonsImage(page: CommonsPage) {
  const info = page.imageinfo?.[0];
  return info?.thumburl || info?.url || null;
}

export function buildPalArtworkSearch(request: GameArtworkRequest) {
  const platform = displayPlatform(request.platform);
  return `"${request.title}" "${platform}" PAL (cover OR box OR cartridge OR cart OR disc OR label)`;
}

export async function resolveGameArtwork(request: GameArtworkRequest): Promise<string | null> {
  // Deliberately PAL-only. A missing image is preferable to showing a US/Japanese
  // version and implying it represents the user's PAL collection.
  const search = buildPalArtworkSearch(request);
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    generator: "search",
    gsrsearch: search,
    gsrnamespace: "6",
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "700",
  });

  const payload = await fetchCommons(params);
  const ranked = (payload.query?.pages ?? [])
    .filter((page) => commonsImage(page))
    .map((page) => ({ page, score: scorePalArtworkCandidate(page, request) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score);

  return commonsImage(ranked[0]?.page);
}
