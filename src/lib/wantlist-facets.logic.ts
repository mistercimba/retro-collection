export const WANTLIST_REGIONS = ["PAL", "NTSC-U", "NTSC-J", "Region free", "Unknown / other"] as const;
export const WANTLIST_VARIANTS = ["Standard", "Black Label", "Platinum", "Player's Choice", "Greatest Hits", "Limited", "Collector", "Steelbook", "Special Edition", "Other"] as const;

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

export function normalizeWantlistVariant(value: string): WantlistVariant {
  const text = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-US");
  if (/\bsteel\s?book\b/.test(text)) return "Steelbook";
  if (/\bplayer'?s\s+choice\b/.test(text)) return "Player's Choice";
  if (/\bgreatest\s+hits\b/.test(text)) return "Greatest Hits";
  if (/\bplatinum\b/.test(text)) return "Platinum";
  if (/\bcollector(?:'?s)?\b|\bcollectors?\s+edition\b/.test(text)) return "Collector";
  if (/\blimited\b/.test(text)) return "Limited";
  if (/\bblack\s+label\b/.test(text)) return "Black Label";
  if (/\bspecial\s+edition\b/.test(text)) return "Special Edition";
  if (/\bstandard\b|\boriginal\b/.test(text)) return "Standard";
  return "Other";
}

export function collectWantlistRegions(values: string[]): WantlistRegion[] {
  const used = new Set(values.map(normalizeWantlistRegion));
  return WANTLIST_REGIONS.filter((region) => used.has(region));
}

export function collectWantlistVariants(values: string[]): WantlistVariant[] {
  const used = new Set(values.map(normalizeWantlistVariant));
  return WANTLIST_VARIANTS.filter((variant) => used.has(variant));
}
