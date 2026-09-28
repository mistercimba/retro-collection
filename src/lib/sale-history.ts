export type SaleNoteFacts = { date: string | null; priceEur: number | null };

/** Extract only explicitly phrased sale facts from free-text notes; never infer from acquisition or valuation fields. */
export function parseSaleNoteFacts(notes: string): SaleNoteFacts {
  const match = notes.match(/sold by owner on (\d{4}-\d{2}-\d{2}) for €\s*(\d+(?:[.,]\d{2})?)/i);
  if (!match) return { date: null, priceEur: null };
  const date = new Date(`${match[1]}T00:00:00Z`);
  const priceEur = Number(match[2].replace(",", "."));
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== match[1] || !Number.isFinite(priceEur)) return { date: null, priceEur: null };
  return { date: match[1], priceEur };
}
