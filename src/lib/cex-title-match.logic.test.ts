import { describe, expect, it } from "vitest";
import { cexTitleIdentity, isCexPerfectGrade, stripCexReferenceAnnotations } from "./cex-title-match.logic";

describe("CeX reference title matching", () => {
  it("removes CeX rarity condition and packaging annotations without changing the game identity", () => {
    for (const title of [
      "Persona 4 (Com CD), Sem Manual, Caixa",
      "Persona 4 (Com CD), + Manual, Caixa",
      "Persona 4 (Com CD), Perfeito",
    ]) {
      expect(cexTitleIdentity(title, "PS2", true)).toBe("persona 4");
    }
    expect(cexTitleIdentity("Persona 3 FES, Perfeito", "PS2", true)).toBe("persona 3 fes");
  });

  it("keeps condition wording out of the target title unless it is a known CeX annotation", () => {
    expect(stripCexReferenceAnnotations("The Good Life")).toBe("The Good Life");
    expect(cexTitleIdentity("The Legend of Zelda: Ocarina of Time 3D", "3DS")).toBe("legend of zelda ocarina of time 3d");
  });

  it("recognizes the CeX rarity Perfeito grade so it is never treated as generic Loose pricing", () => {
    expect(isCexPerfectGrade("Persona 4 (Com CD), Perfeito")).toBe(true);
    expect(isCexPerfectGrade("Persona 4")).toBe(false);
  });
});
