import type { ValuationSnapshot } from "./types";

export function isAuditCompleted(status: string | undefined): boolean {
  return status?.trim().toLocaleLowerCase("en") === "confirmed";
}

function latest(items: ValuationSnapshot[]): ValuationSnapshot | null {
  return items.map((valuation, index) => ({ valuation, index }))
    .sort((a, b) => {
      const dateA = Date.parse(a.valuation.snapshotDate) || 0;
      const dateB = Date.parse(b.valuation.snapshotDate) || 0;
      return dateB - dateA || b.index - a.index;
    })[0]?.valuation ?? null;
}

export function selectLatestValuation(collectionId: string, catalogId: string, valuations: ValuationSnapshot[]): ValuationSnapshot | null {
  const copySpecific = valuations.filter((valuation) => valuation.collectionId === collectionId);
  if (copySpecific.length) return latest(copySpecific);
  if (!catalogId) return null;
  return latest(valuations.filter((valuation) => valuation.catalogId === catalogId));
}
