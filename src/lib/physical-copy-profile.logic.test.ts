import { describe, expect, it } from "vitest";
import { derivePhysicalCopyStatus, physicalCopyNeedsReview, physicalCopyProfile } from "./physical-copy-profile.logic";

describe("physical copy profiles", () => {
  it("uses cartridge/manual checks for cardboard-era Nintendo games", () => {
    expect(physicalCopyProfile("Game Boy").components.map((item) => item.key)).toEqual(["media", "box", "manual"]);
  });

  it("does not invent a manual requirement for modern platforms", () => {
    expect(physicalCopyProfile("Nintendo Switch").components.map((item) => item.key)).toEqual(["media", "box"]);
    expect(physicalCopyProfile("Playstation 5").components.map((item) => item.key)).toEqual(["media", "box"]);
  });

  it("derives CIB, Loose, incomplete and review states", () => {
    const profile = physicalCopyProfile("Playstation 2");
    expect(derivePhysicalCopyStatus(profile, { media: "yes", box: "yes", manual: "yes" }, false)).toBe("CIB");
    expect(derivePhysicalCopyStatus(profile, { media: "yes", box: "no", manual: "no" }, false)).toBe("Loose");
    expect(derivePhysicalCopyStatus(profile, { media: "yes", box: "yes", manual: "no" }, false)).toBe("Incomplete");
    expect(derivePhysicalCopyStatus(profile, { media: "yes", box: "unknown", manual: "yes" }, false)).toBe("Needs review");
    expect(derivePhysicalCopyStatus(profile, {}, true)).toBe("Sealed");
  });

  it("flags unknown expected components for later review", () => {
    const profile = physicalCopyProfile("Nintendo 64");
    expect(physicalCopyNeedsReview(profile, { media: "yes", box: "yes", manual: "unknown" })).toBe(true);
    expect(physicalCopyNeedsReview(profile, { media: "yes", box: "no", manual: "yes" })).toBe(false);
  });
});
