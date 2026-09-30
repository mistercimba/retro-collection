import { describe, expect, it } from "vitest";
import { buildPlatformListUrl, getWishlistPriceCondition, getWishlistPriceLines, parsePlatformListState, sortWishlistByCeiling } from "./wishlist-price.logic";

describe("wishlist condition pricing", () => {
  const guide = { looseEur: 35, cibEur: 120, newEur: 250 };

  it("selects the requested loose, CIB, complete, or sealed price", () => {
    expect(getWishlistPriceCondition("loose funcional")).toBe("loose");
    expect(getWishlistPriceLines("loose funcional", guide)).toEqual([{ label: "PC Loose", value: 35, reference: false }]);
    expect(getWishlistPriceLines("CIB bom estado", guide)).toEqual([{ label: "PC CIB", value: 120, reference: false }]);
    expect(getWishlistPriceLines("completo", guide)).toEqual([{ label: "PC CIB", value: 120, reference: false }]);
    expect(getWishlistPriceLines("sealed", guide)).toEqual([{ label: "PC New", value: 250, reference: false }]);
  });

  it("labels an unknown condition fallback and never presents CIB as Loose", () => {
    expect(getWishlistPriceLines("PAL edição standard", guide)).toEqual([{ label: "PC CIB · referência", value: 120, reference: true }]);
    expect(getWishlistPriceLines("loose", { looseEur: null, cibEur: 120, newEur: null })).toEqual([
      { label: "Loose: —", value: null, reference: false },
      { label: "CIB · referência", value: 120, reference: true },
    ]);
    expect(getWishlistPriceLines("selado", null)).toEqual([{ label: "PC New", value: null, reference: false }]);
  });
});

describe("wishlist maximum sorting", () => {
  it("keeps all-null order stable", () => {
    const items = [{ id: "a", priceCeilingEur: null }, { id: "b", priceCeilingEur: null }];
    expect(sortWishlistByCeiling(items).map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("sorts defined ceilings descending and places nulls last", () => {
    const items = [{ id: "a", priceCeilingEur: null }, { id: "b", priceCeilingEur: 25 }, { id: "c", priceCeilingEur: 80 }];
    expect(sortWishlistByCeiling(items).map((item) => item.id)).toEqual(["c", "b", "a"]);
  });
});

describe("platform list return URL", () => {
  it("retains tab, search, filter, and sorting in the detail return route", () => {
    const state = { tab: "wishlist" as const, q: "Silent Hill", filter: "Alta", sort: "max-desc" };
    const href = buildPlatformListUrl("ps2", state);
    expect(href)
      .toBe("/platform/ps2?tab=wishlist&q=Silent+Hill&filter=Alta&sort=max-desc");
    expect(parsePlatformListState(href.slice(href.indexOf("?")))).toEqual(state);
  });
});
