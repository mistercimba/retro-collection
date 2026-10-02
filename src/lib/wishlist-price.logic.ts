import { getSafeListReturnPath } from "./list-url-state.logic";
import { targetBuyCondition, type WishlistBuyReferenceGuide } from "./wishlist-buy-reference.logic";

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

export type PlatformListState = {
  tab: "collection" | "wishlist";
  q: string;
  filter: string;
  condition: string;
  reference: string;
  sort: string;
};

export function parsePlatformListState(search: string, initialTab: PlatformListState["tab"] = "collection"): PlatformListState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const tab = params.get("tab") === "wishlist" ? "wishlist" : params.get("tab") === "collection" ? "collection" : initialTab;
  const requestedSort = params.get("sort") ?? (tab === "wishlist" ? "priority" : "title");
  const sort = requestedSort === "market-desc" ? "buy-desc" : requestedSort;
  return {
    tab,
    q: params.get("q") ?? "",
    filter: params.get("filter") ?? "all",
    condition: params.get("condition") ?? "all",
    reference: params.get("reference") ?? "all",
    sort,
  };
}

export function serializePlatformListState(state: PlatformListState): string {
  const params = new URLSearchParams();
  if (state.tab === "wishlist") params.set("tab", state.tab);
  if (state.q) params.set("q", state.q);
  if (state.filter !== "all") params.set("filter", state.filter);
  if (state.condition !== "all") params.set("condition", state.condition);
  if (state.reference !== "all") params.set("reference", state.reference);
  if (state.sort !== (state.tab === "wishlist" ? "priority" : "title")) params.set("sort", state.sort);
  return params.toString();
}

export function buildPlatformListUrl(slug: string, state: PlatformListState): string {
  const query = serializePlatformListState(state);
  return `/platform/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
}

export type WishlistListItem = { targetId: string; title: string; priority: string; targetVersion: string; priceCeilingEur: number | null };
const priorityRank: Record<string, number> = { grail: 0, alta: 1, "média": 2, media: 2, baixa: 3 };
const rank = (value: string) => priorityRank[value.toLocaleLowerCase("pt-PT")] ?? 9;
export const wishlistPriceKey = (item: Pick<WishlistListItem, "targetId" | "title">) => `${item.targetId}:${item.title}`;

export function filterWishlistItems<T extends WishlistListItem>(
  items: readonly T[],
  state: Pick<PlatformListState, "q" | "filter" | "condition">,
): T[] {
  return items.filter((item) => {
    const condition = targetBuyCondition(item.targetVersion);
    const matchesCondition = state.condition === "all"
      || (state.condition === "undefined" ? condition === null : condition === state.condition);
    return (!state.q || item.title.toLocaleLowerCase("pt-PT").includes(state.q.toLocaleLowerCase("pt-PT")))
      && (state.filter === "all" || item.priority === state.filter)
      && matchesCondition;
  });
}

export function wishlistBuyReferenceValue(
  item: WishlistListItem,
  guide: WishlistBuyReferenceGuide | null | undefined,
): number | null {
  const condition = targetBuyCondition(item.targetVersion);
  if (!condition || !guide) return null;
  return guide[condition].valueEur;
}

export function filterWishlistByReference<T extends WishlistListItem>(
  items: readonly T[],
  reference: string,
  guides: Record<string, WishlistBuyReferenceGuide> = {},
): T[] {
  if (reference === "all") return [...items];
  return items.filter((item) => {
    const condition = targetBuyCondition(item.targetVersion);
    const guide = guides[wishlistPriceKey(item)];
    const available = condition
      ? guide?.[condition].valueEur !== null && guide?.[condition].valueEur !== undefined
      : Boolean(guide && (guide.loose.valueEur !== null || guide.cib.valueEur !== null));
    return reference === "available" ? available : reference === "missing" ? !available : true;
  });
}

export function selectWishlistItems<T extends WishlistListItem>(
  items: readonly T[],
  state: PlatformListState,
  prices: Record<string, WishlistPriceGuide> = {},
  buyReferences: Record<string, WishlistBuyReferenceGuide> = {},
): T[] {
  const filtered = filterWishlistByReference(filterWishlistItems(items, state), state.reference, buyReferences);
  if (state.sort === "max-desc") return sortWishlistByCeiling(filtered);
  return filtered.sort((a, b) => {
    if (state.sort === "title") return a.title.localeCompare(b.title, "pt-PT");
    if (state.sort === "buy-desc") {
      return (wishlistBuyReferenceValue(b, buyReferences[wishlistPriceKey(b)]) ?? -1)
        - (wishlistBuyReferenceValue(a, buyReferences[wishlistPriceKey(a)]) ?? -1);
    }
    if (state.sort === "market-desc") {
      return (getWishlistPriceLines(b.targetVersion, prices[wishlistPriceKey(b)] ?? null)[0]?.value ?? -1)
        - (getWishlistPriceLines(a.targetVersion, prices[wishlistPriceKey(a)] ?? null)[0]?.value ?? -1);
    }
    return rank(a.priority) - rank(b.priority) || a.title.localeCompare(b.title, "pt-PT");
  });
}

export function getWishlistOriginState(from: string | string[] | undefined, slug: string): PlatformListState | null {
  const safe = getSafeListReturnPath(from);
  if (!safe) return null;
  const url = new URL(safe, "https://retro-collection.invalid");
  if (url.pathname !== `/platform/${slug}` || url.searchParams.getAll("tab").length !== 1 || url.searchParams.get("tab") !== "wishlist") return null;
  return parsePlatformListState(url.search);
}

export function getWishlistNeighbors<T extends WishlistListItem>(items: readonly T[], current: Pick<T, "targetId" | "title">): { previous: T | null; next: T | null } {
  const index = items.findIndex(item => item.targetId === current.targetId && item.title === current.title);
  return { previous: index > 0 ? items[index - 1] : null, next: index >= 0 && index < items.length - 1 ? items[index + 1] : null };
}
