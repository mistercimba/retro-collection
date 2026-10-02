import { editionsCompatible, titleMatchRank, type TitleMatchRank } from "./game-title-match.logic";

export function normalizeMatchTitle(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function formatPlaytime(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "";
  const hours = Math.round(seconds / 3600);
  if (hours < 1) return "< 1 h";
  const weeks = Math.floor(hours / 168);
  const days = Math.floor((hours % 168) / 24);
  const remainder = hours % 24;
  return [weeks ? `${weeks} sem.` : "", days ? `${days} d` : "", remainder ? `${remainder} h` : ""].filter(Boolean).join(" ");
}

export function exactUniqueMatch<T extends { name: string }>(title: string, candidates: T[]): { status: "matched"; candidate: T } | { status: "ambiguous" | "unmatched"; candidate: null } {
  const matches = candidates.filter((candidate) => normalizeMatchTitle(candidate.name) === normalizeMatchTitle(title));
  return matches.length === 1 ? { status: "matched", candidate: matches[0] } : { status: matches.length ? "ambiguous" : "unmatched", candidate: null };
}

export function parseEcbUsdEur(csv: string): { rate: number; date: string } | null {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0]?.split(",").map((column) => column.replace(/^"|"$/g, "").toUpperCase());
  if (!header) return null;
  const valueIndex = header.indexOf("OBS_VALUE");
  const dateIndex = header.indexOf("TIME_PERIOD");
  if (valueIndex < 0 || dateIndex < 0) return null;
  for (const line of lines.slice(1).reverse()) {
    const columns = line.split(",").map((column) => column.replace(/^"|"$/g, ""));
    const rate = Number(columns[valueIndex]);
    if (Number.isFinite(rate) && rate > 0 && columns[valueIndex] !== "") return { rate, date: columns[dateIndex] };
  }
  return null;
}

export function selectPriceChartingPrice(product: Record<string, unknown>, sealed: boolean, complete: boolean): { usd: number; basis: string } | null {
  const field = sealed ? "new-price" : complete ? "cib-price" : "loose-price";
  const cents = Number(product[field]);
  return Number.isFinite(cents) && cents > 0 ? { usd: cents / 100, basis: field } : null;
}

const PRICECHARTING_PLATFORMS: Record<string, { id: string; slug: string }> = {
  Playstation: { id: "PS1", slug: "pal-playstation" },
  "Playstation 2": { id: "PS2", slug: "pal-playstation-2" },
  NES: { id: "NES", slug: "pal-nes" },
  SNES: { id: "SNES", slug: "pal-super-nintendo" },
  "Nintendo 64": { id: "N64", slug: "pal-nintendo-64" },
  GameCube: { id: "GameCube", slug: "pal-gamecube" },
  "Nintendo Wii": { id: "Wii", slug: "pal-wii" },
  "Nintendo Wii U": { id: "Wii U", slug: "pal-wii-u" },
  "Nintendo Switch": { id: "Switch", slug: "pal-nintendo-switch" },
  "Game Boy": { id: "Game Boy", slug: "pal-gameboy" },
  "Game Boy Color": { id: "GBC", slug: "pal-gameboy-color" },
  "GameBoy Advance": { id: "GBA", slug: "pal-gameboy-advance" },
  "Nintendo DS": { id: "DS", slug: "pal-nintendo-ds" },
  "Nintendo 3DS": { id: "3DS", slug: "pal-nintendo-3ds" },
  "Playstation 3": { id: "PS3", slug: "pal-playstation-3" },
  "Playstation 5": { id: "PS5", slug: "pal-playstation-5" },
};

export type PricechartingCatalog = {
  source?: string;
  region?: string;
  currency?: string;
  generatedAt?: string;
  games?: Array<Record<string, unknown> & { platform?: string; region?: string; title?: string; normalizedTitle?: string; aliases?: string[]; pricechartingUrl?: string; loose?: number | null; cib?: number | null; new?: number | null; scrapedAt?: string }>;
};

export function lookupPalPricechartingMatch(catalog: PricechartingCatalog, platform: string, title: string, edition: string): { product: NonNullable<PricechartingCatalog["games"]>[number]; pricechartingPlatform: string } | null {
  const targetPlatform = PRICECHARTING_PLATFORMS[platform];
  if (catalog.source !== "pricecharting-pal-local-snapshot" || catalog.region !== "PAL" || catalog.currency !== "USD" || !catalog.generatedAt || !Number.isFinite(Date.parse(catalog.generatedAt)) || !targetPlatform || !Array.isArray(catalog.games)) return null;

  const ranked: Array<{ product: NonNullable<PricechartingCatalog["games"]>[number]; rank: TitleMatchRank }> = [];
  const expectedEdition = `${title} ${edition}`.trim();

  for (const entry of catalog.games) {
    if (entry.platform !== targetPlatform.id || entry.region !== "PAL" || !entry.title || !entry.pricechartingUrl || !entry.scrapedAt || !Number.isFinite(Date.parse(entry.scrapedAt))) continue;
    if (!editionsCompatible(expectedEdition, entry.title)) continue;

    try {
      const url = new URL(entry.pricechartingUrl);
      if (url.protocol !== "https:" || url.hostname !== "www.pricecharting.com" || !url.pathname.startsWith(`/game/${targetPlatform.slug}/`)) continue;
    } catch {
      continue;
    }

    const labels = [entry.title, ...(Array.isArray(entry.aliases) ? entry.aliases : [])];
    const ranks = labels.map((label) => titleMatchRank(title, label, targetPlatform.id)).filter((rank): rank is TitleMatchRank => rank !== null);
    if (!ranks.length) continue;
    ranked.push({ product: entry, rank: Math.min(...ranks) as TitleMatchRank });
  }

  if (!ranked.length) return null;
  const bestRank = Math.min(...ranked.map((candidate) => candidate.rank)) as TitleMatchRank;
  const best = ranked.filter((candidate) => candidate.rank === bestRank);
  const unique = [...new Map(best.map((candidate) => [candidate.product.pricechartingUrl, candidate.product])).values()];
  return unique.length === 1 ? { product: unique[0], pricechartingPlatform: targetPlatform.id } : null;
}

export function estimateCondition(game: { sealed: string; media: string; box: string; manual: string }): { sealed: boolean; complete: boolean; label: "New" | "CIB" | "Loose" } | null {
  const yes = (value: string) => /^(yes|sim|true|1)$/i.test(value.trim());
  const no = (value: string) => /^(no|nao|não|false|0)$/i.test(value.trim());
  if (yes(game.sealed)) return { sealed: true, complete: false, label: "New" };
  if (!no(game.sealed)) return null;
  const parts = [game.media, game.box, game.manual];
  if (parts.every(yes)) return { sealed: false, complete: true, label: "CIB" };
  if (parts.some(no)) return { sealed: false, complete: false, label: "Loose" };
  return null;
}

export function selectSnapshotPrice(product: Record<string, unknown>, condition: "New" | "CIB" | "Loose"): number | null {
  const value = product[condition === "New" ? "new" : condition === "CIB" ? "cib" : "loose"];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
