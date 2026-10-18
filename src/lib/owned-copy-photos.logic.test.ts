import { describe, expect, it } from "vitest";
import {
  MAX_OWNED_COPY_PHOTO_BYTES,
  EMPTY_PHOTO_SLOTS,
  adjacentPhotoIndex,
  isOwnedCopyPhotoKind,
  ownedCopyPhotoExtension,
  ownedCopyPhotoLabel,
  validateOwnedCopyPhotoFile,
} from "./owned-copy-photos.logic";

describe("owned-copy photo rules", () => {
  it("accepts only the explicit physical-copy photo categories", () => {
    expect(isOwnedCopyPhotoKind("front")).toBe(true);
    expect(isOwnedCopyPhotoKind("media")).toBe(true);
    expect(isOwnedCopyPhotoKind("interior")).toBe(true);
    expect(isOwnedCopyPhotoKind("cover")).toBe(false);
  });

  it("keeps labels and file extensions explicit", () => {
    expect(ownedCopyPhotoLabel("manual")).toBe("Manual / inserts");
    expect(ownedCopyPhotoLabel("interior")).toBe("Interior da caixa");
    expect(ownedCopyPhotoExtension("image/jpeg")).toBe("jpg");
    expect(ownedCopyPhotoExtension("image/webp")).toBe("webp");
    expect(ownedCopyPhotoExtension("image/gif")).toBeNull();
  });

  it("rejects unsupported, empty and oversized files", () => {
    expect(validateOwnedCopyPhotoFile({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validateOwnedCopyPhotoFile({ type: "image/gif", size: 1000 })).toMatch(/JPEG/);
    expect(validateOwnedCopyPhotoFile({ type: "image/jpeg", size: 0 })).toMatch(/vazia/);
    expect(validateOwnedCopyPhotoFile({ type: "image/jpeg", size: MAX_OWNED_COPY_PHOTO_BYTES + 1 })).toMatch(/4 MB/);
  });
});

describe("private photo viewer navigation", () => {
  it("moves in either direction and wraps within one copy", () => {
    expect(adjacentPhotoIndex(0, 3, 1)).toBe(1);
    expect(adjacentPhotoIndex(2, 3, 1)).toBe(0);
    expect(adjacentPhotoIndex(0, 3, -1)).toBe(2);
    expect(adjacentPhotoIndex(0, 1, 1)).toBe(0);
    expect(adjacentPhotoIndex(11, 12, 1)).toBe(0);
  });

  it("does not select a photo from an empty or invalid gallery", () => {
    expect(adjacentPhotoIndex(0, 0, 1)).toBeNull();
    expect(adjacentPhotoIndex(-1, 4, 1)).toBeNull();
    expect(adjacentPhotoIndex(4, 4, -1)).toBeNull();
    expect(adjacentPhotoIndex(Number.NaN, 4, 1)).toBeNull();
  });
});

describe("empty physical-photo shelf", () => {
  it("invites exact front, back and interior photos with valid upload kinds", () => {
    expect(EMPTY_PHOTO_SLOTS.map(slot => slot.label)).toEqual(["Frente", "Trás", "Interior"]);
    expect(EMPTY_PHOTO_SLOTS.every(slot => isOwnedCopyPhotoKind(slot.kind))).toBe(true);
    expect(new Set(EMPTY_PHOTO_SLOTS.map(slot => slot.kind)).size).toBe(3);
  });
});
