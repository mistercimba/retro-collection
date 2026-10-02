import { describe, expect, it } from "vitest";
import {
  MAX_OWNED_COPY_PHOTO_BYTES,
  isOwnedCopyPhotoKind,
  ownedCopyPhotoExtension,
  ownedCopyPhotoLabel,
  validateOwnedCopyPhotoFile,
} from "./owned-copy-photos.logic";

describe("owned-copy photo rules", () => {
  it("accepts only the explicit physical-copy photo categories", () => {
    expect(isOwnedCopyPhotoKind("front")).toBe(true);
    expect(isOwnedCopyPhotoKind("media")).toBe(true);
    expect(isOwnedCopyPhotoKind("cover")).toBe(false);
  });

  it("keeps labels and file extensions explicit", () => {
    expect(ownedCopyPhotoLabel("manual")).toBe("Manual / inserts");
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
