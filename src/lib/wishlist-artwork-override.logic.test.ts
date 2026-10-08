import { describe, expect, it } from "vitest";
import type { LibraryData } from "./data/types";
import {
  materializedWishlistCandidatePath,
  MAX_WISHLIST_ARTWORK_BYTES,
  shouldDeleteUncommittedWishlistArtwork,
  wishlistArtworkImageType,
} from "./wishlist-artwork-override.logic";

describe("Wishlist manual artwork storage safety", () => {
  it("only permits an exact materialized file for the candidate", () => {
    expect(materializedWishlistCandidatePath("libretro-test", "/covers/wishlist-candidates/libretro-test.png"))
      .toBe("/covers/wishlist-candidates/libretro-test.png");
    expect(() => materializedWishlistCandidatePath("libretro-test", "/covers/wishlist-candidates/other.png")).toThrow();
    expect(() => materializedWishlistCandidatePath("../etc", "/covers/wishlist-candidates/../etc.png")).toThrow();
    expect(() => materializedWishlistCandidatePath("valid-id", "https://source.example/image.png")).toThrow();
  });

  it("validates the actual image signature, not a remote content-type header", () => {
    expect(wishlistArtworkImageType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1]))).toBe("image/png");
    expect(wishlistArtworkImageType(new Uint8Array([255, 216, 255, 1]))).toBe("image/jpeg");
    expect(() => wishlistArtworkImageType(new TextEncoder().encode("alias.png"))).toThrow();
    expect(() => wishlistArtworkImageType(new Uint8Array())).toThrow();
    expect(() => wishlistArtworkImageType(new Uint8Array(MAX_WISHLIST_ARTWORK_BYTES + 1))).toThrow();
  });

  it("preserves the uploaded asset when a fresh read fails or already references it", () => {
    const pathname = "retro-collection/wishlist-artwork-overrides/APP-123/new.png";
    const previousPathname = "retro-collection/wishlist-artwork-overrides/APP-123/old.png";
    const library = {
      wishlist: [{ artworkOverride: { pathname: previousPathname } }],
    } as unknown as Pick<LibraryData, "wishlist">;
    expect(shouldDeleteUncommittedWishlistArtwork(null, pathname)).toBe(false);
    expect(shouldDeleteUncommittedWishlistArtwork(library, pathname)).toBe(true);
    const committed = {
      wishlist: [{ artworkOverride: { pathname } }],
    } as unknown as Pick<LibraryData, "wishlist">;
    expect(shouldDeleteUncommittedWishlistArtwork(committed, pathname)).toBe(false);
  });
});
