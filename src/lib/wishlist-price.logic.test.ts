import { describe, expect, it } from "vitest";
import { buildPlatformListUrl, filterWishlistByReference, filterWishlistItems, getWishlistPriceCondition, getWishlistPriceLines, parsePlatformListState, sortWishlistByCeiling, selectWishlistItems, getWishlistOriginState, getWishlistNeighbors, wishlistPriceKey } from "./wishlist-price.logic";

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

describe("wishlist navigation follows its origin list", () => {
  const items = [
    { targetId: "NOVO", title: "Project Zero", priority: "Alta", targetVersion: "CIB", priceCeilingEur: null },
    { targetId: "NOVO", title: "Persona 4", priority: "Grail", targetVersion: "CIB", priceCeilingEur: 20 },
    { targetId: "NOVO", title: "Persona 3 FES", priority: "Grail", targetVersion: "loose", priceCeilingEur: 50 },
  ];
  it("filters by query and priority and stops at the last matching title", () => {
    const from = "/platform/ps2?tab=wishlist&q=PERSONA&filter=Grail&sort=title";
    const state = getWishlistOriginState(from, "ps2")!;
    const list = selectWishlistItems(items, state);
    expect(list.map(x => x.title)).toEqual(["Persona 3 FES", "Persona 4"]);
    expect(getWishlistNeighbors(list, items[1])).toEqual({ previous: items[2], next: null });
    expect(getWishlistNeighbors(list, items[0])).toEqual({ previous: null, next: null });
    expect(buildPlatformListUrl("ps2", state)).toBe("/platform/ps2?tab=wishlist&q=PERSONA&filter=Grail&sort=title");
  });
  it("shares priority and maximum order without mutating the input", () => {
    const state = { tab: "wishlist" as const, q: "", filter: "all", condition: "all", reference: "all", sort: "priority" };
    expect(selectWishlistItems(items, state).map(x => x.title)).toEqual(["Persona 3 FES", "Persona 4", "Project Zero"]);
    expect(selectWishlistItems(items, { ...state, sort: "max-desc" }).map(x => x.priceCeilingEur)).toEqual([50, 20, null]);
    expect(items[0].title).toBe("Project Zero");
  });
  it("sorts by the calculated buy reference and keeps missing references last", () => {
    const state = { tab: "wishlist" as const, q: "", filter: "all", condition: "all", reference: "all", sort: "buy-desc" };
    const buyReferences = {
      [wishlistPriceKey(items[0])]: { loose: { valueEur: null }, cib: { valueEur: 10 } },
      [wishlistPriceKey(items[1])]: { loose: { valueEur: null }, cib: { valueEur: 25 } },
      [wishlistPriceKey(items[2])]: { loose: { valueEur: 40 }, cib: { valueEur: null } },
    } as never;
    expect(selectWishlistItems(items, state, {}, buyReferences).map(x => x.title)).toEqual(["Persona 3 FES", "Persona 4", "Project Zero"]);
    expect(selectWishlistItems(items, state).map(x => x.title)).toEqual(items.map(x => x.title));
  });
  it("rejects external, wrong-platform, non-wishlist and ambiguous origins", () => {
    for (const from of ["https://evil.test/platform/ps2?tab=wishlist", "//evil.test/platform/ps2?tab=wishlist", "/platform/ps5?tab=wishlist", "/platform/ps2", "/platform/ps2?tab=collection", "/platform/ps2?tab=wishlist&tab=collection", "/want?tab=wishlist", "/login?tab=wishlist"]) expect(getWishlistOriginState(from, "ps2")).toBeNull();
    expect(getWishlistOriginState(["/platform/ps2?tab=wishlist"], "ps2")).toBeNull();
  });
});

describe("wishlist buying filters", () => {
  const items = [
    { targetId: "A", title: "Loose Game", priority: "Alta", targetVersion: "PAL · Loose", priceCeilingEur: null },
    { targetId: "B", title: "CIB Game", priority: "Média", targetVersion: "PAL · CIB", priceCeilingEur: null },
    { targetId: "C", title: "Unknown Game", priority: "Baixa", targetVersion: "PAL · Standard", priceCeilingEur: null },
  ];

  it("filters by target buying condition without guessing undefined targets", () => {
    const base = { q: "", filter: "all" };
    expect(filterWishlistItems(items, { ...base, condition: "loose" }).map(x => x.title)).toEqual(["Loose Game"]);
    expect(filterWishlistItems(items, { ...base, condition: "cib" }).map(x => x.title)).toEqual(["CIB Game"]);
    expect(filterWishlistItems(items, { ...base, condition: "undefined" }).map(x => x.title)).toEqual(["Unknown Game"]);
  });

  it("filters by calculated reference availability", () => {
    const guides = {
      [wishlistPriceKey(items[0])]: { loose: { valueEur: 18 }, cib: { valueEur: null } },
      [wishlistPriceKey(items[1])]: { loose: { valueEur: null }, cib: { valueEur: null } },
      [wishlistPriceKey(items[2])]: { loose: { valueEur: 10 }, cib: { valueEur: 30 } },
    } as never;
    expect(filterWishlistByReference(items, "available", guides).map(x => x.title)).toEqual(["Loose Game", "Unknown Game"]);
    expect(filterWishlistByReference(items, "missing", guides).map(x => x.title)).toEqual(["CIB Game"]);
  });

  it("migrates the old market sort URL to the calculated buy-reference sort", () => {
    expect(parsePlatformListState("?tab=wishlist&sort=market-desc")).toMatchObject({
      tab: "wishlist",
      condition: "all",
      reference: "all",
      sort: "buy-desc",
    });
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
    const state = { tab: "wishlist" as const, q: "Silent Hill", filter: "Alta", condition: "cib", reference: "available", sort: "max-desc" };
    const href = buildPlatformListUrl("ps2", state);
    expect(href)
      .toBe("/platform/ps2?tab=wishlist&q=Silent+Hill&filter=Alta&condition=cib&reference=available&sort=max-desc");
    expect(parsePlatformListState(href.slice(href.indexOf("?")))).toEqual(state);
  });
});
