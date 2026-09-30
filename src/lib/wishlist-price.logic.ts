export type WishlistPriceCondition = "loose" | "cib" | "new";
export type WishlistPriceGuide = { looseEur: number | null; cibEur: number | null; newEur: number | null };
export type WishlistPriceLine = { label: string; value: number | null; reference: boolean };

export function getWishlistPriceCondition(targetVersion: string): WishlistPriceCondition | null {
  const value = targetVersion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT");
  if (/\b(sealed|selado|selada|new|novo|nova)\b/.test(value)) return "new";
  if (/\b(cib|complete|completo|completa)\b/.test(value)) return "cib";
  if (/\bloose\b/.test(value)) return "loose";
  return null;
}

const labels: Record<WishlistPriceCondition, string> = { loose: "Loose", cib: "CIB", new: "New" };

export function getWishlistPriceLines(targetVersion: string, guide: WishlistPriceGuide | null): WishlistPriceLine[] {
  const condition = getWishlistPriceCondition(targetVersion);
  if (!guide) return [{ label: condition ? `PC ${labels[condition]}` : "PC sem condição definida", value: null, reference: false }];

  if (condition) {
    const requested = guide[`${condition}Eur`];
    if (requested !== null) return [{ label: `PC ${labels[condition]}`, value: requested, reference: false }];
    const alternatives: WishlistPriceCondition[] = ["loose", "cib", "new"].filter((candidate) => candidate !== condition) as WishlistPriceCondition[];
    const available = alternatives.filter((candidate) => guide[`${candidate}Eur`] !== null);
    return [
      { label: `${labels[condition]}: —`, value: null, reference: false },
      ...available.slice(0, 1).map((candidate) => ({ label: `${labels[candidate]} · referência`, value: guide[`${candidate}Eur`], reference: true })),
    ];
  }

  const fallback = (["cib", "loose", "new"] as const).find((candidate) => guide[`${candidate}Eur`] !== null);
  return fallback
    ? [{ label: `PC ${labels[fallback]} · referência`, value: guide[`${fallback}Eur`], reference: true }]
    : [{ label: "PC sem preço disponível", value: null, reference: false }];
}

export function sortWishlistByCeiling<T extends { priceCeilingEur: number | null }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.priceCeilingEur === null && b.priceCeilingEur !== null) return 1;
    if (a.priceCeilingEur !== null && b.priceCeilingEur === null) return -1;
    if (a.priceCeilingEur === null || b.priceCeilingEur === null) return 0;
    return b.priceCeilingEur - a.priceCeilingEur;
  });
}

export type PlatformListState = { tab: "collection" | "wishlist"; q: string; filter: string; sort: string };
export function parsePlatformListState(search: string, initialTab: PlatformListState["tab"] = "collection"): PlatformListState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const tab = params.get("tab") === "wishlist" ? "wishlist" : params.get("tab") === "collection" ? "collection" : initialTab;
  return { tab, q: params.get("q") ?? "", filter: params.get("filter") ?? "all", sort: params.get("sort") ?? (tab === "wishlist" ? "priority" : "title") };
}

export function serializePlatformListState(state: PlatformListState): string {
  const params = new URLSearchParams();
  if (state.tab === "wishlist") params.set("tab", state.tab);
  if (state.q) params.set("q", state.q);
  if (state.filter !== "all") params.set("filter", state.filter);
  if (state.sort !== (state.tab === "wishlist" ? "priority" : "title")) params.set("sort", state.sort);
  return params.toString();
}

export function buildPlatformListUrl(slug: string, state: PlatformListState): string {
  const query = serializePlatformListState(state);
  return `/platform/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
}
