import "server-only";
import type { CexConditionResult, CexPriceReference, CexWishlistGuide, WishlistBuyCondition } from "@/lib/wishlist-buy-reference.logic";
import { measureServerFetch, measureServerWork } from "@/lib/server-perf";

const CATALOG_REPOSITORY = "mistercimba/vinted-retro-search";
const CATALOG_PATH = "data/reference/cex-pt-catalog.json";

type CexCatalogGame = {
  boxId?: string;
  boxName?: string;
  platform?: string;
  productKind?: string | null;
  sellPrice?: number | null;
  cashPrice?: number | null;
  cexUrl?: string | null;
  variantSignals?: {
    packaging?: string | null;
    edition?: {
      flags?: Record<string, boolean>;
      isStandard?: boolean;
    };
  };
};

type CexCatalog = {
  version?: number;
  source?: string;
  generatedAt?: string;
  games?: CexCatalogGame[];
};

const PLATFORM_MAP: Record<string, string> = {
  NES: "NES",
  SNES: "SNES",
  "Nintendo 64": "N64",
  GameCube: "GameCube",
  "Nintendo Wii": "Wii",
  "Nintendo Wii U": "Wii U",
  "Nintendo Switch": "Switch",
  "Game Boy": "Game Boy",
  "Game Boy Color": "GBC",
  "GameBoy + Color": "GBC",
  "GameBoy Advance": "GBA",
  "Nintendo DS": "DS",
  "Nintendo 3DS": "3DS",
  Playstation: "PS1",
  "Playstation 2": "PS2",
  "Playstation 3": "PS3",
  "Playstation 5": "PS5",
  PSP: "PSP",
};

const EDITION_PATTERNS: Record<string, RegExp> = {
  platinum: /\bplatinum\b/,
  playersChoice: /\bplayers choice\b/,
  nintendoSelects: /\bnintendo selects\b/,
  essentials: /\bessentials\b/,
  greatestHits: /\bgreatest hits\b/,
  nesClassics: /\bnes classics\b/,
  dayOne: /\bday one\b/,
  limited: /\blimited\b/,
  collector: /\bcollectors?\b/,
  steel: /\bsteel(?:book| box)?\b/,
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .toLocaleLowerCase("pt-PT")
    .replace(/player'?s\s+choice/g, "players choice")
    .replace(/steel\s*book/g, "steelbook")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editionFlags(value: string) {
  const text = normalize(value);
  return Object.fromEntries(Object.entries(EDITION_PATTERNS).map(([key, pattern]) => [key, pattern.test(text)]));
}

function candidateEditionFlags(game: CexCatalogGame) {
  const stored = game.variantSignals?.edition?.flags;
  if (stored) return Object.fromEntries(Object.keys(EDITION_PATTERNS).map((key) => [key, Boolean(stored[key])]));
  return editionFlags(String(game.boxName ?? ""));
}

function editionCompatible(targetVersion: string, game: CexCatalogGame) {
  const wanted = editionFlags(targetVersion);
  const candidate = candidateEditionFlags(game);
  return Object.keys(EDITION_PATTERNS).every((key) => wanted[key] === candidate[key]);
}

function stripKnownNoise(value: string) {
  let text = normalize(value);
  const phrases = [
    "sem manual caixa", "sem caixa", "solo juego", "disc only", "disk only", "so disco", "apenas disco",
    "cartridge only", "cartucho only", "so cartucho", "apenas cartucho", "players choice", "nintendo selects",
    "greatest hits", "nes classics", "day one", "steelbook", "steel box", "limited edition",
    "collector edition", "collectors edition", "platinum", "essentials",
  ];
  for (const phrase of phrases) text = text.replace(new RegExp(`\\b${phrase.replace(/ /g, "\\s+")}\\b`, "g"), " ");
  return text
    .replace(/\b(?:caixa|box|edition|edicao|pal|game|jogo)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleIdentity(value: string, platform: string) {
  let text = stripKnownNoise(value.replace(/\[[^\]]*(?:19|20)\d{2}[^\]]*\]/g, " "));
  const noise: Record<string, string[]> = {
    PS1: ["playstation", "ps1", "sony"],
    PS2: ["playstation 2", "playstation", "ps2", "sony"],
    PS3: ["playstation 3", "playstation", "ps3", "sony"],
    PS5: ["playstation 5", "playstation", "ps5", "sony"],
    NES: ["nintendo entertainment system", "nes", "nintendo"],
    SNES: ["super nintendo entertainment system", "super nintendo", "snes", "nintendo"],
    N64: ["nintendo 64", "n64", "nintendo"],
    GameCube: ["nintendo gamecube", "gamecube", "nintendo"],
    Wii: ["nintendo wii", "wii", "nintendo"],
    "Wii U": ["nintendo wii u", "wii u", "nintendo"],
    Switch: ["nintendo switch", "switch", "nintendo"],
    "Game Boy": ["nintendo game boy", "game boy", "gameboy", "nintendo"],
    GBC: ["nintendo game boy color", "game boy color", "gameboy color", "gbc", "nintendo"],
    GBA: ["nintendo game boy advance", "game boy advance", "gameboy advance", "gba", "nintendo"],
    DS: ["nintendo ds", "ds", "nintendo"],
    "3DS": ["nintendo 3ds", "3ds", "nintendo"],
    PSP: ["playstation portable", "psp", "sony"],
  };
  for (const phrase of (noise[platform] ?? []).sort((a, b) => b.length - a.length)) {
    text = text.replace(new RegExp(`\\b${normalize(phrase).replace(/ /g, "\\s+")}\\b`, "g"), " ");
  }
  return text.replace(/\bthe\b/g, " ").replace(/\s+/g, " ").trim();
}

function packagingCondition(game: CexCatalogGame): WishlistBuyCondition | "generic" | null {
  const packaging = String(game.variantSignals?.packaging ?? "");
  if (packaging === "loose") return "loose";
  if (packaging === "boxed") return "cib";
  if (packaging === "standard") return "generic";
  return null;
}

function money(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
}

function toReference(game: CexCatalogGame): CexPriceReference | null {
  const sellEur = money(game.sellPrice);
  const cashEur = money(game.cashPrice);
  const boxId = String(game.boxId ?? "").trim();
  const boxName = String(game.boxName ?? "").trim();
  if (!sellEur || !cashEur || !boxId || !boxName) return null;
  return {
    boxId,
    boxName,
    sellEur,
    cashEur,
    url: String(game.cexUrl ?? "").trim() || `https://pt.webuy.com/product-detail?id=${encodeURIComponent(boxId)}`,
  };
}

async function getCatalog(): Promise<CexCatalog | null> {
  const token = process.env.PRICECHARTING_CATALOG_GITHUB_TOKEN;
  if (!token) return null;
  const ref = process.env.PRICECHARTING_CATALOG_REF || "main";
  const url = `https://api.github.com/repos/${CATALOG_REPOSITORY}/contents/${CATALOG_PATH}?ref=${encodeURIComponent(ref)}`;
  try {
    const response = await measureServerFetch("cex.github_fetch", () => fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28" },
      next: { revalidate: 3600 },
    }));
    if (!response.ok) return null;
    const catalog = await measureServerWork("cex.snapshot_parse", () => response.json() as Promise<CexCatalog>);
    if (catalog.version !== 1 || catalog.source !== "cex-pt-live-catalog" || !catalog.generatedAt || !Array.isArray(catalog.games)) return null;
    return catalog;
  } catch {
    return null;
  }
}

const unavailable = (): CexConditionResult => ({ status: "unavailable", reference: null });

function resultFor(candidates: CexPriceReference[]): CexConditionResult {
  if (candidates.length === 1) return { status: "matched", reference: candidates[0] };
  if (candidates.length > 1) return { status: "ambiguous", reference: null };
  return unavailable();
}

export async function getCexWishlistGuides(
  entries: Array<{ key: string; platform: string; title: string; edition?: string }>,
): Promise<Map<string, CexWishlistGuide>> {
  const results = new Map<string, CexWishlistGuide>();
  if (!entries.length) return results;
  const catalog = await getCatalog();
  if (!catalog) {
    for (const entry of entries) results.set(entry.key, { source: "CeX Portugal indisponível", date: "", loose: unavailable(), cib: unavailable(), generic: unavailable() });
    return results;
  }

  await measureServerWork("cex.local_match", async () => {
    for (const entry of entries) {
      const cexPlatform = PLATFORM_MAP[entry.platform];
      if (!cexPlatform) {
        results.set(entry.key, { source: "CeX Portugal", date: catalog.generatedAt!.slice(0, 10), loose: unavailable(), cib: unavailable(), generic: unavailable() });
        continue;
      }
      const targetIdentity = titleIdentity(entry.title, cexPlatform);
      const byCondition: Record<WishlistBuyCondition | "generic", CexPriceReference[]> = { loose: [], cib: [], generic: [] };

      for (const game of catalog.games ?? []) {
        if (game.platform !== cexPlatform || game.productKind !== "game") continue;
        const condition = packagingCondition(game);
        if (!condition) continue;
        if (!editionCompatible(entry.edition ?? "", game)) continue;
        if (titleIdentity(String(game.boxName ?? ""), cexPlatform) !== targetIdentity) continue;
        const reference = toReference(game);
        if (reference) byCondition[condition].push(reference);
      }

      results.set(entry.key, {
        source: "CeX Portugal",
        date: catalog.generatedAt!.slice(0, 10),
        loose: resultFor(byCondition.loose),
        cib: resultFor(byCondition.cib),
        generic: resultFor(byCondition.generic),
      });
    }
  });

  return results;
}

export async function getCexWishlistGuide(platform: string, title: string, edition = ""): Promise<CexWishlistGuide> {
  return (await getCexWishlistGuides([{ key: "single", platform, title, edition }])).get("single")
    ?? { source: "CeX Portugal indisponível", date: "", loose: unavailable(), cib: unavailable(), generic: unavailable() };
}
