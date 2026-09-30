import { describe, expect, it } from "vitest";
import { resolveWishlistArtworkFromEntries } from "./wishlist-artwork";
import {
  createCollectionWishlistArtworkIndex,
  resolveCollectionWishlistArtworkFromIndex,
  resolveDedicatedWishlistArtwork,
  resolveCollectionWishlistArtwork,
  type WishlistArtworkTarget,
} from "./wishlist-artwork.logic";

const target = (overrides: Partial<WishlistArtworkTarget> = {}): WishlistArtworkTarget => ({
  targetId: "NOVO",
  title: "Silent Hill 2",
  platform: "Playstation 2",
  targetVersion: "PAL original",
  ...overrides,
});

const games = [
  { collectionId: "PS2-1", title: "Silent Hill 2", platform: "Playstation 2" },
  { collectionId: "PS1-1", title: "Resident Evil", platform: "Playstation" },
  { collectionId: "PS2-2", title: "Resident Evil", platform: "Playstation 2" },
  { collectionId: "N64-1", title: "Pokémon Stadium", platform: "Nintendo 64" },
  { collectionId: "PS2-3", title: "Duplicate", platform: "Playstation 2" },
  { collectionId: "PS2-4", title: "Duplicate", platform: "Playstation 2" },
].map((game) => ({ ...game, region: "PAL" }));

const collectionArtwork = {
  "PS2-1": "/covers/PS2-1.jpg",
  "PS1-1": "/covers/PS1-1.jpg",
  "PS2-2": "/covers/PS2-2.jpg",
  "N64-1": "/covers/N64-1.jpg",
  "PS2-3": "/covers/PS2-3.jpg",
  "PS2-4": "/covers/PS2-4.jpg",
};

describe("wishlist artwork resolver", () => {
  it("uses one dedicated title and platform artwork match", () => {
    const wanted = target();
    const key = JSON.stringify(["NOVO", "playstation 2", "silent hill 2", "Europe"]);
    expect(resolveDedicatedWishlistArtwork(wanted, { [key]: "/covers/wishlist/unique.png" }))
      .toBe("/covers/wishlist/unique.png");
  });

  it("falls back to a unique matching Collection artwork entry", () => {
    expect(resolveCollectionWishlistArtwork(target(), games, collectionArtwork))
      .toBe("/covers/PS2-1.jpg");
  });

  it("does not use an identically named game from another platform", () => {
    expect(resolveCollectionWishlistArtwork(target({ title: "Resident Evil", platform: "Nintendo 64" }), games, collectionArtwork))
      .toBeNull();
  });

  it("falls back when Collection has more than one matching artwork candidate", () => {
    expect(resolveCollectionWishlistArtwork(target({ title: "Duplicate" }), games, collectionArtwork))
      .toBeNull();
  });

  it("falls back for a title absent from local artwork", () => {
    expect(resolveWishlistArtworkFromEntries(target({ title: "Not A Real Game" }), games, collectionArtwork, {}))
      .toBeNull();
  });

  it("matches simple accent and punctuation differences", () => {
    expect(resolveCollectionWishlistArtwork(target({ title: "Pokemon: Stadium!", platform: "N64" }), games, collectionArtwork))
      .toBe("/covers/N64-1.jpg");
  });

  it("does not match a different sequel number", () => {
    expect(resolveCollectionWishlistArtwork(target({ title: "Silent Hill 3" }), games, collectionArtwork))
      .toBeNull();
  });

  it("keeps explicitly different regions separate", () => {
    const europe = target();
    const usKey = JSON.stringify(["NOVO", "playstation 2", "silent hill 2", "US"]);
    expect(resolveDedicatedWishlistArtwork(europe, { [usKey]: "/covers/wishlist/us.png" })).toBeNull();
  });

  it("uses dedicated artwork before Collection reuse", () => {
    const wanted = target();
    const key = JSON.stringify(["NOVO", "playstation 2", "silent hill 2", "Europe"]);
    expect(resolveWishlistArtworkFromEntries(wanted, games, collectionArtwork, { [key]: "/covers/wishlist/dedicated.png" }))
      .toBe("/covers/wishlist/dedicated.png");
  });

  it("does not reuse PAL Collection artwork for an explicit US wishlist target", () => {
    expect(resolveCollectionWishlistArtwork(target({ targetVersion: "NTSC-U" }), games, collectionArtwork)).toBeNull();
  });

  it("leaves Collection artwork with an unknown region unresolved", () => {
    for (const region of ["Unknown", "NTSC", ""]) {
      expect(resolveCollectionWishlistArtwork(target(), [{ ...games[0], region }], collectionArtwork)).toBeNull();
    }
  });

  it("keeps an indexed ambiguity unresolved even with a third candidate", () => {
    const duplicate = { ...games[0], collectionId: "third" };
    const index = createCollectionWishlistArtworkIndex([games[0], duplicate, { ...duplicate, collectionId: "fourth" }], {
      ...collectionArtwork, third: "/covers/third.jpg", fourth: "/covers/fourth.jpg",
    });
    expect(resolveCollectionWishlistArtworkFromIndex(target(), index)).toBeNull();
  });

  it("indexes separately the same title and platform in two known regions", () => {
    const index = createCollectionWishlistArtworkIndex([games[0], { ...games[0], collectionId: "us", region: "NTSC-U" }], {
      ...collectionArtwork, us: "/covers/us.jpg",
    });
    expect(resolveCollectionWishlistArtworkFromIndex(target(), index)).toBe("/covers/PS2-1.jpg");
    expect(resolveCollectionWishlistArtworkFromIndex(target({ targetVersion: "NTSC-U" }), index)).toBe("/covers/us.jpg");
  });
});
