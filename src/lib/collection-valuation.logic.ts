/** Read-only valuation for one physical copy; never persisted from estimates. */
export type CopyValue = {
  value: number | null;
  source: string;
  date: string;
  basis: string;
  kind: "pricecharting" | "snapshot" | "legacy" | "unavailable";
};
type CopyFields = {
  marketValueEur: number | null;
  latestValuation?: {
    valueEur: number | null;
    source: string;
    snapshotDate: string;
    conditionBasis: string;
  } | null;
};
type Estimate = { value: number | null; source: string; date: string; basis: string };
function known(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
export function resolveCopyValue(copy: CopyFields, estimate?: Estimate | null): CopyValue {
  if (estimate && known(estimate.value)) {
    return { value: estimate.value, source: estimate.source, date: estimate.date, basis: estimate.basis, kind: "pricecharting" };
  }
  const snapshot = copy.latestValuation;
  if (snapshot && known(snapshot.valueEur)) {
    return { value: snapshot.valueEur, source: snapshot.source ? `Valorização registada · ${snapshot.source}` : "Valorização registada", date: snapshot.snapshotDate, basis: snapshot.conditionBasis, kind: "snapshot" };
  }
  if (known(copy.marketValueEur)) {
    return { value: copy.marketValueEur, source: "Valor legado registado na coleção", date: "", basis: "", kind: "legacy" };
  }
  return { value: null, source: "Valor não disponível", date: "", basis: "", kind: "unavailable" };
}
export function copyValueDescription(value: CopyValue): string {
  return [value.source, value.basis, value.date].filter(Boolean).join(" · ");
}
