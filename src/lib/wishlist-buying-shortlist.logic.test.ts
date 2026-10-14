import { describe, expect, it } from "vitest";
import type { CexWishlistGuide } from "./wishlist-buy-reference.logic";
import {
  buildWishlistBuyingRows,
  selectBuyingTargets,
  sortWishlistBuyingRows,
  wishlistBuyingKey,
  type BuyingPriceGuide,
  type BuyingTarget,
} from "./wishlist-buying-shortlist.logic";

const target = (changes: Partial<BuyingTarget> = {}): BuyingTarget => ({
  targetId: "NOVO",
  title: "Test Game",
  platform: "GameCube",
  priority: "Alta",
  targetVersion: "PAL · CIB",
  priceCeilingEur: 35,
  planState: "active",
  matchState: "missing",
  acquisition: null,
  ...changes,
});

const unavailable = { status: "unavailable" as const, reference: null };
function cex(cash: number, sell: number, generic = false): CexWishlistGuide {
  const value = { status: "matched" as const, reference: { boxId: "1", boxName: "Test Game", url: "https://example.test", cashEur: cash, sellEur: sell } };
  return { source: "CeX Portugal", date: "2026-10-14", loose: unavailable, cib: generic ? unavailable : value, generic: generic ? value : unavailable };
}
function calculate(item: BuyingTarget, pc: BuyingPriceGuide | null, cexGuide: CexWishlistGuide | null) {
  const key = wishlistBuyingKey(item);
  return buildWishlistBuyingRows([item], pc ? new Map([[key, pc]]) : new Map(), cexGuide ? new Map([[key, cexGuide]]) : new Map())[0];
}
const pc = (cibEur: number | null, looseEur: number | null = null): BuyingPriceGuide =>
  ({ cibEur, looseEur, date: "2026-10-13" });

describe("read-only Wishlist buying shortlist", () => {
  it("only includes active, definitively missing and not-ordered targets", () => {
    const eligible = target();
    const targets = [
      eligible,
      target({ planState: "inactive" }),
      target({ planState: "unknown" }),
      target({ matchState: "acquired" }),
      target({ matchState: "ambiguous" }),
      target({ acquisition: { state: "ordered", purchaseId: "purchase-1", orderedAt: "2026-10-14" } }),
      target({ acquisition: { state: "ordered", purchaseId: "", orderedAt: "" } }),
    ];
    expect(selectBuyingTargets(targets)).toEqual([eligible]);
    expect(buildWishlistBuyingRows(targets, new Map(), new Map())).toHaveLength(1);
  });

  it("keeps legacy NOVO identities distinct by both console and title", () => {
    const original = target();
    const otherConsole = target({ platform: "Nintendo DS" });
    const otherTitle = target({ title: "Other Game" });
    expect(new Set([original, otherConsole, otherTitle].map(wishlistBuyingKey)).size).toBe(3);
    expect(wishlistBuyingKey(target({ targetId: "a:b", platform: "c", title: "d" })))
      .not.toBe(wishlistBuyingKey(target({ targetId: "a", platform: "b:c", title: "d" })));
  });

  it("uses the existing PriceCharting and exact-condition CeX blended reference", () => {
    const row = calculate(target(), pc(40), cex(20, 40));
    expect(row).toMatchObject({
      condition: "cib", ceilingEur: 35, referenceEur: 35, differenceEur: 0,
      group: "within-ceiling", sourceCount: 2, pricechartingEur: 40,
      cexMidpointEur: 30, cexBasis: "condition-match", pricechartingDate: "2026-10-13",
      cexDate: "2026-10-14",
    });
  });

  it("flags a ceiling below reference without pretending a listing exists", () => {
    expect(calculate(target({ priceCeilingEur: 20 }), pc(40), cex(20, 40))).toMatchObject({
      referenceEur: 35, differenceEur: -15, group: "below-reference",
    });
  });

  it("does not substitute CIB for a requested Loose price", () => {
    const row = calculate(target({ targetVersion: "PAL · loose" }), pc(90), null);
    expect(row).toMatchObject({
      condition: "loose", referenceEur: null, sourceCount: 0,
      group: "incomplete",
    });
  });

  it("does not compare sealed or unspecified physical condition against a Loose/CIB guess", () => {
    for (const version of ["PAL", "PAL · Standard", "sealed", "New"]) {
      expect(calculate(target({ targetVersion: version }), pc(40, 30), cex(20, 40))).toMatchObject({
        condition: null, referenceEur: null, group: "incomplete",
      });
    }
  });

  it("preserves single-source and generic CeX transparency", () => {
    expect(calculate(target(), pc(40), null)).toMatchObject({ referenceEur: 40, sourceCount: 1, cexBasis: null });
    expect(calculate(target(), null, cex(20, 40, true))).toMatchObject({
      referenceEur: 30, sourceCount: 1, cexBasis: "generic",
    });
  });

  it("rejects invalid ceilings and absent prices instead of generating arbitrary deltas", () => {
    for (const ceiling of [0, -2, NaN, Infinity, null]) {
      const row = calculate(target({ priceCeilingEur: ceiling }), pc(40), null);
      expect(row).toMatchObject({ ceilingEur: null, differenceEur: null, group: "incomplete" });
    }
    const missing = calculate(target(), null, null);
    expect(missing).toMatchObject({ referenceEur: null, group: "incomplete" });
    expect(missing.missingReason).toContain("Sem referência");
  });

  it("sorts deterministically by group then priority without mutating the input", () => {
    const a = calculate(target({ title: "A", priority: "Baixa" }), pc(15), null);
    const b = calculate(target({ title: "B", priority: "Grail", priceCeilingEur: 20 }), pc(30), null);
    const c = calculate(target({ title: "C", priority: "Alta", priceCeilingEur: null }), pc(50), null);
    const d = calculate(target({ title: "D", priority: "Grail" }), pc(20), null);
    const rows = [c, a, b, d];
    expect(sortWishlistBuyingRows(rows).map((x) => x.title)).toEqual(["D", "A", "B", "C"]);
    expect(rows[0].title).toBe("C");
    expect(sortWishlistBuyingRows(rows, "reference-asc").map((x) => x.title)).toEqual(["A", "D", "B", "C"]);
    expect(sortWishlistBuyingRows(rows, "difference-desc").map((x) => x.title)).toEqual(["A", "D", "B", "C"]);
  });

  it("reports an empty shortlist when no eligible target exists", () => {
    expect(buildWishlistBuyingRows([target({ matchState: "acquired" })], new Map(), new Map())).toEqual([]);
  });
});
