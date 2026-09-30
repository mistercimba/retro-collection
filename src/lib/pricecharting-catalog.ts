import "server-only";
import type { CollectionGame } from "@/lib/data/types";
import { estimateCondition, lookupPalPricechartingMatch, parseEcbUsdEur, selectSnapshotPrice, type PricechartingCatalog } from "@/lib/external-game-data.logic";
import { measureServerFetch, measureServerWork } from "./server-perf";

const CATALOG_REPOSITORY = "mistercimba/vinted-retro-search";
const CATALOG_PATH = "data/reference/pricecharting-pal-catalog.json";

export type PriceEstimate = { value: number | null; source: string; date: string; basis: string; productUrl: string };

const unavailable = (source: string): PriceEstimate => ({ value: null, source, date: "", basis: "", productUrl: "" });

async function getCatalog(): Promise<PricechartingCatalog | null> {
  const token = process.env.PRICECHARTING_CATALOG_GITHUB_TOKEN;
  if (!token) return null;
  const ref = process.env.PRICECHARTING_CATALOG_REF || "main";
  const url = `https://api.github.com/repos/${CATALOG_REPOSITORY}/contents/${CATALOG_PATH}?ref=${encodeURIComponent(ref)}`;
  try {
    const response = await measureServerFetch("pricecharting.github_fetch", () => fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28" },
      next: { revalidate: 3600 },
    }));
    if (!response.ok) return null;
    const catalog = await measureServerWork("pricecharting.snapshot_parse", () => response.json() as Promise<PricechartingCatalog>);
    if (catalog.source !== "pricecharting-pal-local-snapshot" || catalog.region !== "PAL" || catalog.currency !== "USD" || !catalog.generatedAt || !Number.isFinite(Date.parse(catalog.generatedAt)) || !Array.isArray(catalog.games)) return null;
    return catalog;
  } catch {
    return null;
  }
}

export function getPricechartingCatalogSnapshot(): Promise<PricechartingCatalog | null> {
  return getCatalog();
}

async function getEcbRate() {
  const response = await measureServerFetch("ecb.fx_fetch", () => fetch("https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=csvdata", { next: { revalidate: 86400 } }).catch(() => null));
  return response?.ok ? measureServerWork("ecb.fx_parse", async () => parseEcbUsdEur(await response.text())) : null;
}

/** Read each external snapshot once, then match every collection copy locally. */
export async function getPricechartingEstimates(games: CollectionGame[], catalogSnapshot?: Promise<PricechartingCatalog | null>): Promise<Map<string, PriceEstimate>> {
  const results = new Map<string, PriceEstimate>();
  const token = process.env.PRICECHARTING_CATALOG_GITHUB_TOKEN;
  if (!token) {
    for (const game of games) results.set(game.collectionId, unavailable("Catálogo PriceCharting não configurado"));
    return results;
  }

  const catalog = await (catalogSnapshot ?? getCatalog());
  if (!catalog) {
    for (const game of games) results.set(game.collectionId, unavailable("Snapshot PriceCharting indisponível"));
    return results;
  }

  const pending: { game: CollectionGame; product: NonNullable<ReturnType<typeof lookupPalPricechartingMatch>>["product"]; basis: string; usd: number }[] = [];
  await measureServerWork("pricecharting.local_match", async () => {
    for (const game of games) {
      const match = lookupPalPricechartingMatch(catalog, game.platform, game.title, game.edition);
      if (!match) {
        results.set(game.collectionId, unavailable("Sem correspondência PAL única"));
        continue;
      }
      const condition = estimateCondition(game);
      if (!condition) {
        results.set(game.collectionId, { value: null, source: "Condição/completude da cópia insuficiente", date: "", basis: "", productUrl: match.product.pricechartingUrl ?? "" });
        continue;
      }
      const usd = selectSnapshotPrice(match.product, condition.label);
      const date = String(match.product.scrapedAt ?? "").slice(0, 10);
      if (usd === null) {
        results.set(game.collectionId, { value: null, source: `Preço ${condition.label} indisponível no snapshot`, date, basis: condition.label, productUrl: match.product.pricechartingUrl ?? "" });
        continue;
      }
      pending.push({ game, product: match.product, basis: condition.label, usd });
    }
  });

  if (!pending.length) return results;
  const fx = await getEcbRate();
  for (const { game, product, basis, usd } of pending) {
    results.set(game.collectionId, fx ? {
      value: Math.round((usd / fx.rate) * 100) / 100,
      source: "Catálogo PAL do PriceCharting · BCE",
      date: String(product.scrapedAt ?? "").slice(0, 10),
      basis,
      productUrl: String(product.pricechartingUrl ?? ""),
    } : {
      value: null,
      source: "Taxa USD/EUR do BCE indisponível",
      date: String(product.scrapedAt ?? "").slice(0, 10),
      basis,
      productUrl: String(product.pricechartingUrl ?? ""),
    });
  }
  return results;
}

export async function getPricechartingEstimate(game: CollectionGame): Promise<PriceEstimate> {
  return (await getPricechartingEstimates([game])).get(game.collectionId) ?? unavailable("Estimativa indisponível");
}


export type PriceGuide = {
  looseEur: number | null;
  cibEur: number | null;
  newEur: number | null;
  source: string;
  date: string;
  productUrl: string;
};

const emptyGuide = (source: string, productUrl = "", date = ""): PriceGuide => ({
  looseEur: null, cibEur: null, newEur: null, source, date, productUrl,
});

function guidePrice(value: unknown, rate: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || !rate) return null;
  return Math.round((value / rate) * 100) / 100;
}

export async function getPricechartingGuides(entries: Array<{ key: string; platform: string; title: string; edition?: string }>): Promise<Map<string, PriceGuide>> {
  const results = new Map<string, PriceGuide>();
  if (!entries.length) return results;
  const [catalog, fx] = await Promise.all([getCatalog(), getEcbRate()]);
  if (!catalog) {
    for (const entry of entries) results.set(entry.key, emptyGuide("Snapshot PriceCharting indisponível"));
    return results;
  }
  await measureServerWork("pricecharting.guide_match", async () => {
    for (const entry of entries) {
      const match = lookupPalPricechartingMatch(catalog, entry.platform, entry.title, entry.edition ?? "");
      if (!match) {
        results.set(entry.key, emptyGuide("Sem correspondência PAL única"));
        continue;
      }
      const product = match.product;
      const date = String(product.scrapedAt ?? "").slice(0, 10);
      const productUrl = String(product.pricechartingUrl ?? "");
      if (!fx) {
        results.set(entry.key, emptyGuide("Taxa USD/EUR do BCE indisponível", productUrl, date));
        continue;
      }
      results.set(entry.key, {
        looseEur: guidePrice(product.loose, fx.rate),
        cibEur: guidePrice(product.cib, fx.rate),
        newEur: guidePrice(product.new, fx.rate),
        source: "PriceCharting PAL · BCE",
        date,
        productUrl,
      });
    }
  });
  return results;
}

export async function getPricechartingGuide(platform: string, title: string, edition = ""): Promise<PriceGuide> {
  return (await getPricechartingGuides([{ key: "single", platform, title, edition }])).get("single") ?? emptyGuide("Preço indisponível");
}
