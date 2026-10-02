import { describe, expect, it } from "vitest";
import { buildWishlistBuyReferenceGuide, cexMidpoint, targetBuyCondition } from "./wishlist-buy-reference.logic";

const unavailable = { status: "unavailable" as const, reference: null };

describe("wishlist buy reference", () => {
  it("averages the CeX buy/sell midpoint with PriceCharting", () => {
    const cex = {
      source: "CeX Portugal",
      date: "2026-10-02",
      loose: {
        status: "matched" as const,
        reference: { boxId: "1", boxName: "Game Sem Caixa", sellEur: 20, cashEur: 5, url: "https://example.test/1" },
      },
      cib: {
        status: "matched" as const,
        reference: { boxId: "2", boxName: "Game Caixa", sellEur: 80, cashEur: 40, url: "https://example.test/2" },
      },
    };
    const guide = buildWishlistBuyReferenceGuide({ looseEur: 50, cibEur: 100 }, cex);
    expect(cexMidpoint(cex.loose.reference)).toBe(12.5);
    expect(guide.loose).toMatchObject({ pricechartingEur: 50, cexMidpointEur: 12.5, valueEur: 31.25, sourceCount: 2, confidence: "two-sources" });
    expect(guide.cib).toMatchObject({ pricechartingEur: 100, cexMidpointEur: 60, valueEur: 80, sourceCount: 2, confidence: "two-sources" });
  });

  it("falls back to the one trustworthy source without inventing a second one", () => {
    const guide = buildWishlistBuyReferenceGuide(
      { looseEur: 35, cibEur: null },
      { source: "CeX Portugal", date: "", loose: unavailable, cib: unavailable },
    );
    expect(guide.loose).toMatchObject({ valueEur: 35, sourceCount: 1, confidence: "single-source" });
    expect(guide.cib).toMatchObject({ valueEur: null, sourceCount: 0, confidence: "unavailable" });
  });

  it("only treats loose and CIB as buying conditions", () => {
    expect(targetBuyCondition("PAL · loose")).toBe("loose");
    expect(targetBuyCondition("PAL · CIB")).toBe("cib");
    expect(targetBuyCondition("PAL · completo")).toBe("cib");
    expect(targetBuyCondition("sealed")).toBeNull();
    expect(targetBuyCondition("PAL · Standard")).toBeNull();
  });
});
