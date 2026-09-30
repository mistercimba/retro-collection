import { describe, expect, it } from "vitest";
import { resolveWishlistArtworkFromEntries } from "./wishlist-artwork";
import {
  wishlistArtworkIdentity,
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
].map((game) => ({ ...game, region: "PAL", coverVariant: "Standard" }));

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
    const key = JSON.stringify(["NOVO", "playstation 2", "silent hill 2", "Europe", "Standard"]);
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
    const usKey = JSON.stringify(["NOVO", "playstation 2", "silent hill 2", "US", "Standard"]);
    expect(resolveDedicatedWishlistArtwork(europe, { [usKey]: "/covers/wishlist/us.png" })).toBeNull();
  });

  it("uses dedicated artwork before Collection reuse", () => {
    const wanted = target();
    const key = JSON.stringify(["NOVO", "playstation 2", "silent hill 2", "Europe", "Standard"]);
    expect(resolveWishlistArtworkFromEntries(wanted, games, collectionArtwork, { [key]: "/covers/wishlist/dedicated.png" }))
      .toBe("/covers/wishlist/dedicated.png");
  });

  it("does not reuse PAL Collection artwork for an explicit US wishlist target", () => {
    expect(resolveCollectionWishlistArtwork(target({ targetVersion: "NTSC-U original" }), games, collectionArtwork)).toBeNull();
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
    expect(resolveCollectionWishlistArtworkFromIndex(target({ targetVersion: "NTSC-U original" }), index)).toBe("/covers/us.jpg");
  });
});


describe("cover edition identity", () => {
  it("keeps Standard artwork across Loose/CIB condition changes", () => {
    const loose = target({ targetVersion: "PAL original; loose funcional" });
    const cib = target({ targetVersion: "PAL original; CIB" });
    expect(wishlistArtworkIdentity(loose)).toBe(wishlistArtworkIdentity(cib));
    expect(wishlistArtworkIdentity(loose)).toBe(wishlistArtworkIdentity(target({ targetVersion: "PAL Standard" })));
    const artwork = { [wishlistArtworkIdentity(loose)]: "/covers/wishlist/standard.png" };
    expect(resolveDedicatedWishlistArtwork(cib, artwork)).toBe("/covers/wishlist/standard.png");
  });

  it.each(["Platinum", "Nintendo Selects", "Player's Choice", "Greatest Hits", "Black Label", "Steelbook", "Limited", "Collector", "Special Edition"])("invalidates Standard artwork when edition changes to %s", (edition) => {
    const original = target();
    const changed = target({ targetVersion: `PAL ${edition}; CIB` });
    expect(wishlistArtworkIdentity(changed)).not.toBe(wishlistArtworkIdentity(original));
    const artwork = { [wishlistArtworkIdentity(original)]: "/covers/wishlist/standard.png" };
    expect(resolveDedicatedWishlistArtwork(changed, artwork)).toBeNull();
    expect(resolveWishlistArtworkFromEntries(changed, games, collectionArtwork, artwork)).toBeNull();
  });

  it("keeps every recognized edition distinct", () => {
    const editions = ["Standard", "Platinum", "Nintendo Selects", "Player's Choice", "Greatest Hits", "Black Label", "Steelbook", "Limited", "Collector", "Special Edition"];
    expect(new Set(editions.map((edition) => wishlistArtworkIdentity(target({ targetVersion: `PAL ${edition}` })))).size).toBe(editions.length);
  });

  it("never resolves unknown editions or legacy region-only keys", () => {
    const unknown = target({ targetVersion: "PAL Europe" });
    expect(resolveDedicatedWishlistArtwork(unknown, { [wishlistArtworkIdentity(unknown)]: "/covers/unknown.png" })).toBeNull();
    expect(resolveDedicatedWishlistArtwork(target(), { '["NOVO","playstation 2","silent hill 2","Europe"]': "/covers/legacy.png" })).toBeNull();
  });

  it("does not infer Collection cover edition from copy edition", () => {
    const unknownCover = [{ ...games[0], coverVariant: undefined, edition: "Standard" }];
    expect(resolveCollectionWishlistArtwork(target(), unknownCover, collectionArtwork)).toBeNull();
  });

  it("matches explicitly verified Collection cover editions separately", () => {
    const platinum = { ...games[0], collectionId: "platinum", coverVariant: "Platinum" };
    const artwork = { ...collectionArtwork, platinum: "/covers/platinum.jpg" };
    expect(resolveCollectionWishlistArtwork(target({ targetVersion: "PAL Platinum" }), [...games, platinum], artwork)).toBe("/covers/platinum.jpg");
    expect(resolveCollectionWishlistArtwork(target(), [...games, platinum], artwork)).toBe("/covers/PS2-1.jpg");
  });
});
