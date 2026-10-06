import { describe, expect, it } from "vitest";
import { isOrderedWishlistTarget, wishlistOrderPurchaseId } from "./wishlist-acquisition.logic";

describe("wishlist acquisition state", () => {
  it("recognizes a real ordered target", () => {
    const target = { acquisition: { state: "ordered" as const, purchaseId: "APP-1", orderedAt: "2026-10-06T20:00:00.000Z" } };
    expect(isOrderedWishlistTarget(target)).toBe(true);
    expect(wishlistOrderPurchaseId(target)).toBe("APP-1");
  });

  it("does not treat missing or incomplete acquisition data as ordered", () => {
    expect(isOrderedWishlistTarget({})).toBe(false);
    expect(isOrderedWishlistTarget({ acquisition: null })).toBe(false);
    expect(isOrderedWishlistTarget({ acquisition: { state: "ordered", purchaseId: "", orderedAt: "" } })).toBe(false);
  });
});
