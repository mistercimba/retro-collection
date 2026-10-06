import { describe, expect, it } from "vitest";
import { wishlistCatalogArtworkCompatible } from "./wishlist-catalog-artwork.logic";

describe("wishlist catalog artwork compatibility", () => {
  it("allows canonical artwork for targets without an explicit edition requirement", () => {
    expect(wishlistCatalogArtworkCompatible("PAL; CIB", "Standard")).toBe(true);
  });

  it("allows canonical artwork when the explicit edition matches", () => {
    expect(wishlistCatalogArtworkCompatible("PAL Standard; CIB", "Standard")).toBe(true);
    expect(wishlistCatalogArtworkCompatible("PAL Platinum; CIB", "Platinum")).toBe(true);
  });

  it("does not substitute Standard artwork for a special edition", () => {
    expect(wishlistCatalogArtworkCompatible("PAL Platinum; CIB", "Standard")).toBe(false);
    expect(wishlistCatalogArtworkCompatible("PAL Greatest Hits", "Standard")).toBe(false);
  });

  it("keeps unknown named editions on the deliberate placeholder", () => {
    expect(wishlistCatalogArtworkCompatible("PAL Deluxe Edition", "Standard")).toBe(false);
  });
});
