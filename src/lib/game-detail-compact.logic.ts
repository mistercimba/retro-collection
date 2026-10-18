import type { PriceGuide } from "@/lib/pricecharting-catalog";

/** Missing market prices should not result in three empty value cards. */
export function availableMarketPrices(guide: Pick<PriceGuide, "looseEur" | "cibEur" | "newEur">) {
  return [
    { label: "Loose", value: guide.looseEur },
    { label: "CIB", value: guide.cibEur },
    { label: "New", value: guide.newEur },
  ].filter((item): item is { label: string; value: number } => item.value !== null && Number.isFinite(item.value));
}

export function copySectionInitiallyExpanded(count: number): boolean {
  return count > 0;
}
