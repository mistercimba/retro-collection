import { describe, expect, it } from "vitest";
import { copyValueDescription, resolveCopyValue } from "./collection-valuation.logic";

const copy = { marketValueEur: 35, latestValuation: { valueEur: 42, source: "Avaliação manual", snapshotDate: "2026-09-01", conditionBasis: "CIB" } };
const estimate = { value: 50, source: "PriceCharting PAL · BCE", date: "2026-10-15", basis: "CIB" };

describe("copy valuation resolution", () => {
  it("prefers current PAL pricing, with its source, date and condition", () => {
    const result = resolveCopyValue(copy, estimate);
    expect(result).toMatchObject({ value: 50, kind: "pricecharting", basis: "CIB", date: "2026-10-15" });
    expect(copyValueDescription(result)).toContain("PriceCharting PAL · BCE · CIB · 2026-10-15");
  });
  it("falls back to a dated recorded valuation before the legacy value", () => {
    expect(resolveCopyValue(copy, { ...estimate, value: null })).toMatchObject({ value: 42, kind: "snapshot", date: "2026-09-01" });
  });
  it("preserves known zero and missing value correctly", () => {
    expect(resolveCopyValue({ marketValueEur: 0 })).toMatchObject({ value: 0, kind: "legacy" });
    expect(resolveCopyValue({ marketValueEur: null })).toMatchObject({ value: null, kind: "unavailable" });
    expect(resolveCopyValue({ marketValueEur: -1 }, { ...estimate, value: Number.NaN })).toMatchObject({ value: null, kind: "unavailable" });
  });
  it("keeps copies with different valuation evidence independent", () => {
    const first = resolveCopyValue({ marketValueEur: 40 }, { ...estimate, value: 60 });
    const second = resolveCopyValue({ marketValueEur: 20 }, { ...estimate, value: null });
    expect([first.value, second.value]).toEqual([60, 20]);
    expect([first.kind, second.kind]).toEqual(["pricecharting", "legacy"]);
  });
});
