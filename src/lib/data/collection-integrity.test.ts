import { describe, expect, it } from "vitest";
import { isAuditCompleted, selectLatestValuation } from "./collection-integrity";
import type { ValuationSnapshot } from "./types";

const valuation = (overrides: Partial<ValuationSnapshot>): ValuationSnapshot => ({
  collectionId: "", catalogId: "CAT-1", source: "Test", valueType: "Market",
  valueEur: 10, snapshotDate: "2026-01-01", conditionBasis: "Good", notes: "", ...overrides,
});

describe("valuation association", () => {
  it("always prefers a copy-specific valuation even when a catalog snapshot is newer", () => {
    const exact = valuation({ collectionId: "COPY-1", valueEur: 10, snapshotDate: "2025-01-01" });
    const catalog = valuation({ collectionId: "COPY-2", valueEur: 99, snapshotDate: "2026-01-01" });
    expect(selectLatestValuation("COPY-1", "CAT-1", [catalog, exact])).toBe(exact);
  });

  it("uses the newest catalog snapshot only when this copy has no exact snapshot", () => {
    const old = valuation({ collectionId: "COPY-2", valueEur: 10, snapshotDate: "2025-01-01" });
    const newest = valuation({ valueEur: 20, snapshotDate: "2026-01-01" });
    expect(selectLatestValuation("COPY-1", "CAT-1", [old, newest])).toBe(newest);
  });

  it("does not fall back when there is no catalog ID", () => {
    expect(selectLatestValuation("COPY-1", "", [valuation({})])).toBeNull();
  });
});

describe("audit completion", () => {
  it("counts only the explicit Confirmed state as complete", () => {
    expect(isAuditCompleted("Confirmed")).toBe(true);
    for (const status of ["Provisional", "Partial", "In Progress", "Confirmed physical item / identity incomplete", "Confirmed physical item / code incomplete", "Closed — duplicate", ""]) {
      expect(isAuditCompleted(status)).toBe(false);
    }
  });
});
