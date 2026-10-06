import { describe, expect, it } from "vitest";
import { resolveWishlistArtwork, resolveWishlistArtworkFromEntries } from "./wishlist-artwork";
import {
  wishlistArtworkIdentity,
  wishlistArtworkEditionRequirement,
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
  it("gives a valid manual artwork choice priority over automatic sources", () => {
    const result = resolveWishlistArtwork({
      targetId: "APP-123",
      title: "Final Fantasy VIII",
      platform: "Playstation",
      targetVersion: "PAL; CIB",
      artworkOverride: {
        candidateId: "libretro-ff8-spain",
        pathname: "retro-collection/wishlist-artwork-overrides/APP-123/libretro-ff8-spain.png",
        contentType: "image/png",
        source: "libretro-thumbnails",
        sourceRepo: "libretro-thumbnails/Sony_-_PlayStation",
        sourceCommit: "ccee75c7744d81676b6725307aca27ef6be6231a",
        sourcePath: "Named_Boxarts/Final Fantasy VIII (Spain).png",
        selectedAt: "2026-10-06T22:00:00.000Z",
      },
    });
    expect(result).toContain("/api/wishlist-artwork-override/APP-123?");
  });

  it("uses authenticated catalog artwork as a conservative final fallback", () => {
    const result = resolveWishlistArtwork({
      ...target({ targetId: "APP-1", targetVersion: "PAL Standard; CIB" }),
      catalog: {
        source: "IGDB",
        sourceGameId: 123,
        sourcePlatformId: 8,
        title: "Silent Hill 2",
        platform: "Playstation 2",
        edition: "Standard",
        summary: "",
        firstReleaseDate: "",
        genres: [],
        developers: [],
        publishers: [],
        coverImageId: "abc",
        artwork: { source: "IGDB", pathname: "retro-collection/catalog-artwork/igdb/123-abc.jpg", contentType: "image/jpeg" },
        selectedAt: "",
      },
    });
    expect(result).toContain("/api/catalog-artwork/wishlist/APP-1?");
    expect(result).toContain("platform=Playstation+2");
  });

  it("does not use Standard catalog artwork for a Platinum wishlist target", () => {
    expect(resolveWishlistArtwork({
      ...target({ targetId: "APP-2", targetVersion: "PAL Platinum; CIB" }),
      catalog: {
        source: "IGDB",
        sourceGameId: 123,
        sourcePlatformId: 8,
        title: "Silent Hill 2",
        platform: "Playstation 2",
        edition: "Standard",
        summary: "",
        firstReleaseDate: "",
        genres: [],
        developers: [],
        publishers: [],
        coverImageId: "abc",
        artwork: { source: "IGDB", pathname: "retro-collection/catalog-artwork/igdb/123-abc.jpg", contentType: "image/jpeg" },
        selectedAt: "",
      },
    })).toBeNull();
  });

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

  it("never resolves unknown named editions or legacy region-only keys", () => {
    const unknown = target({ targetVersion: "PAL Deluxe Edition; CIB" });
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


describe("artwork edition requirement", () => {
  it.each(["PAL; CIB", "PAL; CIB bom", "PAL; CIB bom estado", "Físico europeu; completo", "PS5 físico europeu; completo", "PAL; completo; confirmar caixa/conteúdo", "PAL; CIB bom; confirmar edição", "PAL; CIB bom estado; microfone opcional", ""])("treats %s as Any without changing facet vocabulary", (version) => {
    expect(wishlistArtworkEditionRequirement(version)).toBe("Any");
  });

  it("keeps Any identity and artwork across CIB/Loose changes", () => {
    const cib = target({ targetVersion: "PAL; CIB" });
    const loose = target({ targetVersion: "PAL; loose" });
    expect(wishlistArtworkIdentity(cib)).toBe(wishlistArtworkIdentity(loose));
    expect(resolveDedicatedWishlistArtwork(loose, { [wishlistArtworkIdentity(cib)]: "/covers/any.png" })).toBe("/covers/any.png");
  });

  it.each(["Platinum", "Standard", "original"])("invalidates Any mappings after an explicit %s edit", (edition) => {
    const any = target({ targetVersion: "PAL; CIB" });
    const changed = target({ targetVersion: `PAL ${edition}; CIB` });
    expect(wishlistArtworkIdentity(changed)).not.toBe(wishlistArtworkIdentity(any));
    expect(resolveDedicatedWishlistArtwork(changed, { [wishlistArtworkIdentity(any)]: "/covers/any.png" })).toBeNull();
    expect(resolveWishlistArtworkFromEntries(changed, [{ ...games[0], coverVariant: undefined }], collectionArtwork, { [wishlistArtworkIdentity(any)]: "/covers/any.png" })).toBeNull();
  });

  it.each(["PAL Deluxe Edition; CIB", "PAL GOTY; loose", "PAL Anniversary Edition", "PAL edição Ultimate", "PAL edição desconhecida", "PAL Deluxe"])("keeps unrecognized named edition %s in fallback", (version) => {
    const unknown = target({ targetVersion: version });
    expect(wishlistArtworkEditionRequirement(version)).toBe("Unknown");
    expect(wishlistArtworkIdentity(unknown)).not.toBe(wishlistArtworkIdentity(target({ targetVersion: "PAL; CIB" })));
    expect(resolveWishlistArtworkFromEntries(unknown, games, collectionArtwork, { [wishlistArtworkIdentity(unknown)]: "/covers/unsafe.png" })).toBeNull();
  });

  it("allows unique title/platform/region Collection artwork for Any without claiming its edition", () => {
    const game = { ...games[0], coverVariant: undefined };
    expect(resolveCollectionWishlistArtwork(target({ targetVersion: "PAL; CIB" }), [game], collectionArtwork)).toBe(collectionArtwork[game.collectionId as keyof typeof collectionArtwork]);
    expect(resolveCollectionWishlistArtwork(target(), [game], collectionArtwork)).toBeNull();
    expect(resolveCollectionWishlistArtwork(target({ targetVersion: "NTSC-U; CIB" }), [game], collectionArtwork)).toBeNull();
  });

  it("keeps Any Collection ambiguity across editions unresolved", () => {
    const platinum = { ...games[0], collectionId: "platinum", coverVariant: "Platinum" };
    expect(resolveCollectionWishlistArtwork(target({ targetVersion: "PAL; CIB" }), [games[0], platinum], { ...collectionArtwork, platinum: "/covers/platinum.jpg" })).toBeNull();
  });
});
