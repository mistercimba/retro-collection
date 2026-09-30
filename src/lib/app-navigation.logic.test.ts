import { describe, expect, it } from "vitest";
import { getActiveAppNavigation } from "./app-navigation.logic";

describe("active app navigation", () => {
  it("tracks platform collection and wishlist tabs", () => {
    expect(getActiveAppNavigation("/platform/ps2", null)).toBe("/collection");
    expect(getActiveAppNavigation("/platform/ps2", "wishlist")).toBe("/want");
  });

  it("keeps detail pages in their parent section", () => {
    expect(getActiveAppNavigation("/wish/target-1", null)).toBe("/want");
    expect(getActiveAppNavigation("/game/PS2-001", null)).toBe("/collection");
  });
});
