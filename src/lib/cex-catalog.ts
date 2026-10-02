import "server-only";
import type { CexConditionResult, CexPriceReference, CexWishlistGuide, WishlistBuyCondition } from "@/lib/wishlist-buy-reference.logic";
import { measureServerFetch, measureServerWork } from "@/lib/server-perf";
import { isCexPerfectGrade, stripCexReferenceAnnotations } from "@/lib/cex-title-match.logic";
import { editionsCompatible, normalizeGameTitle, titleMatchRank, type TitleMatchRank } from "@/lib/game-title-match.logic";

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

type CexReferenceBucket = WishlistBuyCondition | "cib-perfect" | "generic";

function packagingCondition(game: CexCatalogGame): CexReferenceBucket | null {
  const packaging = String(game.variantSignals?.packaging ?? "");
  if (packaging === "loose") return "loose";
  if (packaging === "boxed") return "cib";
  if (packaging === "standard" && isCexPerfectGrade(String(game.boxName ?? ""))) return "cib-perfect";
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
      const ranked: Array<{ game: CexCatalogGame; baseTitle: string; rank: TitleMatchRank }> = [];
      for (const game of catalog.games ?? []) {
        if (game.platform !== cexPlatform || game.productKind !== "game") continue;
        const condition = packagingCondition(game);
        if (!condition) continue;
        if (!editionsCompatible(`${entry.title} ${entry.edition ?? ""}`.trim(), String(game.boxName ?? ""))) continue;
        const baseTitle = stripCexReferenceAnnotations(String(game.boxName ?? ""));
        const matchRank = titleMatchRank(entry.title, baseTitle, cexPlatform);
        if (matchRank === null) continue;
        ranked.push({ game, baseTitle, rank: matchRank });
      }

      if (!ranked.length) {
        results.set(entry.key, {
          source: "CeX Portugal",
          date: catalog.generatedAt!.slice(0, 10),
          loose: unavailable(),
          cib: unavailable(),
          generic: unavailable(),
        });
        continue;
      }

      const bestRank = Math.min(...ranked.map((candidate) => candidate.rank)) as TitleMatchRank;
      const best = ranked.filter((candidate) => candidate.rank === bestRank);
      const identities = new Set(best.map((candidate) => normalizeGameTitle(candidate.baseTitle)));
      if (identities.size !== 1) {
        const ambiguous: CexConditionResult = { status: "ambiguous", reference: null };
        results.set(entry.key, {
          source: "CeX Portugal",
          date: catalog.generatedAt!.slice(0, 10),
          loose: ambiguous,
          cib: ambiguous,
          generic: ambiguous,
        });
        continue;
      }

      const byCondition: Record<CexReferenceBucket, CexPriceReference[]> = { loose: [], cib: [], "cib-perfect": [], generic: [] };
      for (const { game } of best) {
        const condition = packagingCondition(game);
        const reference = condition ? toReference(game) : null;
        if (condition && reference) byCondition[condition].push(reference);
      }

      const exactCib = resultFor(byCondition.cib);
      results.set(entry.key, {
        source: "CeX Portugal",
        date: catalog.generatedAt!.slice(0, 10),
        loose: resultFor(byCondition.loose),
        cib: exactCib.status === "unavailable" ? resultFor(byCondition["cib-perfect"]) : exactCib,
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
