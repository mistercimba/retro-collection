// Synthetic, read-only workload. Run on each ref with: node --import tsx scripts/benchmark-pricing.ts
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { lookupPalPricechartingMatch, type PricechartingCatalog } from "../src/lib/external-game-data.logic";

const games = Array.from({ length: 240 }, (_, i) => ({
  platform: "PS2", region: "PAL", title: `Synthetic Adventure ${i}: The Lost Kingdom`,
  pricechartingUrl: `https://www.pricecharting.com/game/pal-playstation-2/synthetic-${i}`,
  scrapedAt: "2026-10-01T00:00:00Z", loose: i + 1, cib: i + 10, new: null,
}));
const catalog: PricechartingCatalog = {
  source: "pricecharting-pal-local-snapshot", region: "PAL", currency: "USD",
  generatedAt: "2026-10-01T00:00:00Z", games,
};
const queries = [...games.slice(0, 24).map((game) => game.title), "Unrelated Game", "Synthetic Adventure 2 ou 3"];
const cpu = process.cpuUsage();
const started = performance.now();
const results: unknown[] = [];
for (let pass = 0; pass < 3; pass++) {
  for (const title of queries) {
    results.push(lookupPalPricechartingMatch(catalog, "Playstation 2", title, "Standard")?.product.pricechartingUrl ?? null);
  }
}
const used = process.cpuUsage(cpu);
console.log(JSON.stringify({
  catalogEntries: games.length, lookups: results.length,
  cpuMs: (used.user + used.system) / 1000,
  wallMs: Math.round(performance.now() - started),
  resultsSha256: createHash("sha256").update(JSON.stringify(results)).digest("hex"),
}, null, 2));
