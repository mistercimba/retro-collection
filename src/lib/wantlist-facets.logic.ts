import { normalizeWantlistVariant } from "./wantlist-variant.mjs";
export { normalizeWantlistVariant } from "./wantlist-variant.mjs";

export const WANTLIST_REGIONS = ["PAL", "NTSC-U", "NTSC-J", "Region free", "Unknown / other"] as const;
export const WANTLIST_VARIANTS = ["Standard", "Black Label", "Platinum", "Nintendo Selects", "Player's Choice", "Greatest Hits", "Limited", "Collector", "Steelbook", "Special Edition", "Other"] as const;

export type WantlistRegion = (typeof WANTLIST_REGIONS)[number];
export type WantlistVariant = (typeof WANTLIST_VARIANTS)[number];

export function normalizeWantlistRegion(value: string): WantlistRegion {
  const text = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-US");
  if (/\bregion\s*free\b|\ball\s*regions\b|\bregion\s*free\b/.test(text)) return "Region free";
  if (/\bntsc[\s-]*j\b|\bjapan(?:ese)?\b|\bjap(?:\s|$)/.test(text)) return "NTSC-J";
  if (/\bntsc[\s-]*u\b|\busa\b|\bnorth\s+america\b/.test(text)) return "NTSC-U";
  if (/\bpal\b|\beurope(?:an|u|ia)?\b|\beuropa\b|\buk\b/.test(text)) return "PAL";
  return "Unknown / other";
}


export function collectWantlistRegions(values: string[]): WantlistRegion[] {
  const used = new Set(values.map(normalizeWantlistRegion));
  return WANTLIST_REGIONS.filter((region) => used.has(region));
}

export function collectWantlistVariants(values: string[]): WantlistVariant[] {
  const used = new Set(values.map(normalizeWantlistVariant));
  return WANTLIST_VARIANTS.filter((variant) => used.has(variant));
}

