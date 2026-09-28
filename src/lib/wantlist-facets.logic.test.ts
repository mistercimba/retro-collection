import { describe, expect, it } from "vitest";
import { collectWantlistRegions, collectWantlistVariants, normalizeWantlistRegion, normalizeWantlistVariant } from "./wantlist-facets.logic";

describe("concise wantlist facets", () => {
  it("normalizes region without changing the source variant text", () => {
    expect(normalizeWantlistRegion("PAL original; CIB bom estado")).toBe("PAL");
    expect(normalizeWantlistRegion("NTSC-U USA")).toBe("NTSC-U");
    expect(normalizeWantlistRegion("NTSC-J Japão")).toBe("NTSC-J");
    expect(normalizeWantlistRegion("Region free")).toBe("Region free");
    expect(normalizeWantlistRegion("Edição física europeia")).toBe("PAL");
    expect(normalizeWantlistRegion("CIB bom estado")).toBe("Unknown / other");
  });

  it("uses short edition labels and avoids long values as filter options", () => {
    expect(normalizeWantlistVariant("PAL Black Label; CIB Good")).toBe("Black Label");
    expect(normalizeWantlistVariant("PAL Original; loose funcional")).toBe("Standard");
    expect(normalizeWantlistVariant("Player's Choice; CIB" )).toBe("Player's Choice");
    expect(normalizeWantlistVariant("Edição especial Steelbook PAL")).toBe("Steelbook");
    expect(collectWantlistRegions(["PAL original; loose", "PAL Black Label", "CIB only"])).toEqual(["PAL", "Unknown / other"]);
    expect(collectWantlistVariants(["PAL original; loose", "PAL Black Label; CIB Good", "PAL original; loose"])).toEqual(["Standard", "Black Label"]);
  });
});
