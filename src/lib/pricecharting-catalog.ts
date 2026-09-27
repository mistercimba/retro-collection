import "server-only";
import type { CollectionGame } from "@/lib/data/types";
import { estimateCondition, lookupPalPricechartingMatch, parseEcbUsdEur, selectSnapshotPrice, type PricechartingCatalog } from "@/lib/external-game-data.logic";

const CATALOG_REPOSITORY = "mistercimba/vinted-retro-search";
const CATALOG_PATH = "data/reference/pricecharting-pal-catalog.json";

export type PriceEstimate = { value: number | null; source: string; date: string; basis: string; productUrl: string };

async function getCatalog(): Promise<PricechartingCatalog | null> {
  const token = process.env.PRICECHARTING_CATALOG_GITHUB_TOKEN;
  if (!token) return null;
  const ref = process.env.PRICECHARTING_CATALOG_REF || "main";
  const url = `https://api.github.com/repos/${CATALOG_REPOSITORY}/contents/${CATALOG_PATH}?ref=${encodeURIComponent(ref)}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const catalog = await response.json() as PricechartingCatalog;
    if (catalog.source !== "pricecharting-pal-local-snapshot" || catalog.region !== "PAL" || catalog.currency !== "USD" || !catalog.generatedAt || !Number.isFinite(Date.parse(catalog.generatedAt)) || !Array.isArray(catalog.games)) return null;
    return catalog;
  } catch {
    return null;
  }
}

export async function getPricechartingEstimate(game: CollectionGame): Promise<PriceEstimate> {
  if (!process.env.PRICECHARTING_CATALOG_GITHUB_TOKEN) {
    return { value: null, source: "Catálogo PriceCharting não configurado", date: "", basis: "", productUrl: "" };
  }
  const catalog = await getCatalog();
  if (!catalog) return { value: null, source: "Snapshot PriceCharting indisponível", date: "", basis: "", productUrl: "" };
  const match = lookupPalPricechartingMatch(catalog, game.platform, game.title, game.edition);
  if (!match) return { value: null, source: "Sem correspondência PAL única", date: "", basis: "", productUrl: "" };
  const condition = estimateCondition(game);
  if (!condition) return { value: null, source: "Condição/completude da cópia insuficiente", date: "", basis: "", productUrl: match.product.pricechartingUrl ?? "" };
  const usd = selectSnapshotPrice(match.product, condition.label);
  if (usd === null) return { value: null, source: `Preço ${condition.label} indisponível no snapshot`, date: String(match.product.scrapedAt ?? "").slice(0, 10), basis: condition.label, productUrl: match.product.pricechartingUrl ?? "" };

  const fxResponse = await fetch("https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=csvdata", { next: { revalidate: 86400 } }).catch(() => null);
  const fx = fxResponse?.ok ? parseEcbUsdEur(await fxResponse.text()) : null;
  if (!fx) return { value: null, source: "Taxa USD/EUR do BCE indisponível", date: String(match.product.scrapedAt ?? "").slice(0, 10), basis: condition.label, productUrl: match.product.pricechartingUrl ?? "" };
  return {
    value: Math.round((usd / fx.rate) * 100) / 100,
    source: "Catálogo PAL do PriceCharting · BCE",
    date: String(match.product.scrapedAt ?? "").slice(0, 10),
    basis: condition.label,
    productUrl: String(match.product.pricechartingUrl ?? ""),
  };
}
