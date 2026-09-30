import { describe, expect, it } from "vitest";
import { rekeyWishlistArtwork } from "../../scripts/wishlist-artwork-rekey.mjs";
import { wishlistArtworkIdentity } from "./wishlist-artwork.logic";

const target = { targetId: "NOVO", title: "Game", platform: "PS2", targetVersion: "PAL original; CIB" };
const entry = { ...target, targetVersion: "PAL original; loose funcional", file: "/covers/wishlist/kept.png", imageSha256: "unchanged" };

describe("wishlist artwork manifest re-key", () => {
  it("preserves full authoritative targetVersion, filename and digest without downloading", () => {
    const result = rekeyWishlistArtwork([target], { legacy: entry });
    expect(result.entries[wishlistArtworkIdentity(target)]).toEqual({ ...entry, targetVersion: target.targetVersion, coverVariant: "Standard" });
    expect(result.missing).toEqual([]);
  });

  it("falls back for region-only legacy metadata rather than inventing an edition", () => {
    const result = rekeyWishlistArtwork([target], { legacy: { ...entry, targetVersion: "PAL Europe" } });
    expect(result.entries).toEqual({});
    expect(result.missing[0].reason).toBe("source-artwork-edition-unconfirmed");
    expect(result.unassignedEntries[entry.file].targetVersion).toBe(target.targetVersion);
    expect(result.unassignedEntries[entry.file].file).toBe(entry.file);
    expect(result.unassignedEntries[entry.file].coverVariant).toBe("Other");
    expect(rekeyWishlistArtwork([target], result.unassignedEntries)).toEqual(result);
  });

  it("allows a previously reviewed cover edition to re-key a regional legacy entry", () => {
    const result = rekeyWishlistArtwork([target], { legacy: { ...entry, targetVersion: "PAL Europe", coverVariant: "Standard" } });
    expect(result.entries[wishlistArtworkIdentity(target)]?.file).toBe(entry.file);
  });

  it("does not carry the previous edition forward after a target edit", () => {
    const changed = { ...target, targetVersion: "PAL Platinum; CIB" };
    const result = rekeyWishlistArtwork([changed], { old: entry });
    expect(result.entries).toEqual({});
    expect(result.unassignedEntries[entry.file].coverVariant).toBe("Standard");
    expect(rekeyWishlistArtwork([changed], result.unassignedEntries)).toEqual(result);
  });

  it("does not guess between duplicated candidates", () => {
    expect(rekeyWishlistArtwork([target], { a: entry, b: { ...entry, file: "/covers/other.png" } }).missing[0].reason).toBe("ambiguous-artwork-edition");
  });

  it("is idempotent and removes stale target mappings", () => {
    const first = rekeyWishlistArtwork([target], { old: entry });
    expect(rekeyWishlistArtwork([target], first.entries)).toEqual(first);
    expect(rekeyWishlistArtwork([], first.entries).entries).toEqual({});
  });
});


describe("Any requirement re-key", () => {
  it("reactivates a validated regional cover without labelling it Standard", () => {
    const any = { ...target, targetVersion: "PAL; CIB bom" };
    const cover = { ...entry, targetVersion: "PAL Europe", coverVariant: "Other" };
    const first = rekeyWishlistArtwork([any], { archived: cover });
    const active = first.entries[wishlistArtworkIdentity(any)];
    expect(active).toEqual({ ...cover, targetVersion: any.targetVersion });
    expect(active.coverVariant).toBe("Other");
    expect(rekeyWishlistArtwork([any], first.entries)).toEqual(first);
    for (const version of ["PAL Platinum; CIB", "PAL original; CIB"]) {
      const changed = { ...any, targetVersion: version };
      const result = rekeyWishlistArtwork([changed], first.entries);
      expect(result.entries).toEqual({});
      expect(rekeyWishlistArtwork([changed], result.unassignedEntries)).toEqual(result);
    }
  });

  it("does not use an unrecognized named edition as Any", () => {
    const unknown = { ...target, targetVersion: "PAL Deluxe Edition; CIB" };
    expect(rekeyWishlistArtwork([unknown], { cover: entry }).entries).toEqual({});
    expect(rekeyWishlistArtwork([unknown], { cover: entry }).missing[0].reason).toBe("target-artwork-edition-unconfirmed");
  });

  it("keeps known source edition metadata when the requirement is Any", () => {
    const any = { ...target, targetVersion: "PAL; loose" };
    expect(rekeyWishlistArtwork([any], { cover: { ...entry, coverVariant: "Platinum" } }).entries[wishlistArtworkIdentity(any)].coverVariant).toBe("Platinum");
  });
});
