export function sumKnownMarketValues(items: readonly { marketValueEur: number | null }[]): number | null {
  let total: number | null = null;
  for (const item of items) {
    if (item.marketValueEur !== null) total = (total ?? 0) + item.marketValueEur;
  }
  return total;
}
