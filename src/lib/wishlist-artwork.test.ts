import { describe, expect, it } from "vitest";
import { resolveWishlistArtworkFromEntries } from "./wishlist-artwork";

const games = [
  { collectionId: "PS2-1", title: "Silent Hill 2", platform: "Playstation 2" },
  { collectionId: "PS1-1", title: "Resident Evil", platform: "Playstation" },
  { collectionId: "PS2-2", title: "Resident Evil", platform: "Playstation 2" },
  { collectionId: "N64-1", title: "Pokémon Stadium", platform: "Nintendo 64" },
  { collectionId: "PS2-3", title: "Duplicate", platform: "Playstation 2" },
  { collectionId: "PS2-4", title: "Duplicate", platform: "Playstation 2" },
];

const artwork = {
  "PS2-1": "/covers/PS2-1.jpg",
  "PS1-1": "/covers/PS1-1.jpg",
  "PS2-2": "/covers/PS2-2.jpg",
  "N64-1": "/covers/N64-1.jpg",
  "PS2-3": "/covers/PS2-3.jpg",
  "PS2-4": "/covers/PS2-4.jpg",
};

describe("wishlist artwork resolver", () => {
  it("uses the unique matching title and platform", () => {
    expect(resolveWishlistArtworkFromEntries("Silent Hill 2", "Playstation 2", games, artwork))
      .toBe("/covers/PS2-1.jpg");
  });

  it("does not use the same title from another platform", () => {
    expect(resolveWishlistArtworkFromEntries("Resident Evil", "Nintendo 64", games, artwork))
      .toBeNull();
  });

  it("falls back when more than one matching copy exists", () => {
    expect(resolveWishlistArtworkFromEntries("Duplicate", "Playstation 2", games, artwork))
      .toBeNull();
  });

  it("falls back for an unknown title", () => {
    expect(resolveWishlistArtworkFromEntries("Not A Real Game", "Playstation 2", games, artwork))
      .toBeNull();
  });

  it("normalizes accents and punctuation conservatively", () => {
    expect(resolveWishlistArtworkFromEntries("Pokemon: Stadium!", "Nintendo 64", games, artwork))
      .toBe("/covers/N64-1.jpg");
  });
});
