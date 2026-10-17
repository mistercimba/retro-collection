import { describe, expect, it } from "vitest";
import { availableMarketPrices, copySectionInitiallyExpanded } from "./game-detail-compact.logic";

describe("compact game detail", () => {
  it("does not produce empty PAL price cards", () => {
    expect(availableMarketPrices({ looseEur: null, cibEur: null, newEur: null })).toEqual([]);
    expect(availableMarketPrices({ looseEur: null, cibEur: 29.5, newEur: null })).toEqual([{label:"CIB",value:29.5}]);
    expect(availableMarketPrices({ looseEur: 0, cibEur: null, newEur: null })).toEqual([{label:"Loose",value:0}]);
    expect(availableMarketPrices({ looseEur: Number.NaN, cibEur: null, newEur: null })).toEqual([]);
  });
  it("keeps copy needs and photographic evidence visible when present", () => {
    expect(copySectionInitiallyExpanded(0)).toBe(false);
    expect(copySectionInitiallyExpanded(1)).toBe(true);
    expect(copySectionInitiallyExpanded(12)).toBe(true);
  });
});
