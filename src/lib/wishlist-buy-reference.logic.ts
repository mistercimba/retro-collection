export type WishlistBuyCondition = "loose" | "cib";

export type CexPriceReference = {
  boxId: string;
  boxName: string;
  sellEur: number;
  cashEur: number;
  url: string;
};

export type CexConditionResult = {
  status: "matched" | "unavailable" | "ambiguous";
  reference: CexPriceReference | null;
};

export type CexWishlistGuide = {
  source: string;
  date: string;
  loose: CexConditionResult;
  cib: CexConditionResult;
  generic: CexConditionResult;
};

export type WishlistBuyConditionReference = {
  condition: WishlistBuyCondition;
  pricechartingEur: number | null;
  cex: CexPriceReference | null;
  cexMidpointEur: number | null;
  cexBasis: "condition-match" | "generic" | null;
  valueEur: number | null;
  sourceCount: 0 | 1 | 2;
  confidence: "unavailable" | "single-source" | "two-sources";
};

export type WishlistBuyReferenceGuide = {
  loose: WishlistBuyConditionReference;
  cib: WishlistBuyConditionReference;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function cexMidpoint(reference: CexPriceReference | null): number | null {
  if (!reference) return null;
  if (!Number.isFinite(reference.sellEur) || !Number.isFinite(reference.cashEur)) return null;
  return roundMoney((reference.sellEur + reference.cashEur) / 2);
}

function buildConditionReference(
  condition: WishlistBuyCondition,
  pricechartingEur: number | null,
  cexResult: CexConditionResult,
  genericResult: CexConditionResult,
): WishlistBuyConditionReference {
  const useGeneric = cexResult.status === "unavailable" && genericResult.status === "matched";
  const cex = cexResult.status === "matched" ? cexResult.reference : useGeneric ? genericResult.reference : null;
  const midpoint = cexMidpoint(cex);
  const sources = [pricechartingEur, midpoint].filter((value): value is number => value !== null && Number.isFinite(value));
  const sourceCount = sources.length as 0 | 1 | 2;
  return {
    condition,
    pricechartingEur,
    cex,
    cexMidpointEur: midpoint,
    cexBasis: cexResult.status === "matched" ? "condition-match" : useGeneric ? "generic" : null,
    valueEur: sourceCount ? roundMoney(sources.reduce((sum, value) => sum + value, 0) / sourceCount) : null,
    sourceCount,
    confidence: sourceCount === 2 ? "two-sources" : sourceCount === 1 ? "single-source" : "unavailable",
  };
}

export function buildWishlistBuyReferenceGuide(
  pricecharting: { looseEur: number | null; cibEur: number | null },
  cex: CexWishlistGuide,
): WishlistBuyReferenceGuide {
  return {
    loose: buildConditionReference("loose", pricecharting.looseEur, cex.loose, cex.generic),
    cib: buildConditionReference("cib", pricecharting.cibEur, cex.cib, cex.generic),
  };
}

export function targetBuyCondition(targetVersion: string): WishlistBuyCondition | null {
  const value = targetVersion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT");
  if (/\b(cib|complete|completo|completa)\b/.test(value)) return "cib";
  if (/\bloose\b/.test(value)) return "loose";
  return null;
}
