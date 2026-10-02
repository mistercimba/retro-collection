import { describe, expect, it } from "vitest";
import { isCexPerfectGrade, stripCexReferenceAnnotations } from "./cex-title-match.logic";
import { titleMatchRank } from "./game-title-match.logic";

describe("CeX reference title matching", () => {
  it("removes CeX rarity condition and packaging annotations without changing the game identity", () => {
    for (const title of [
      "Persona 4 (Com CD), Sem Manual, Caixa",
      "Persona 4 (Com CD), + Manual, Caixa",
      "Persona 4 (Com CD), Perfeito",
    ]) {
      expect(titleMatchRank("Persona 4", stripCexReferenceAnnotations(title), "PS2")).not.toBeNull();
    }
    expect(titleMatchRank("Persona 3 FES", stripCexReferenceAnnotations("Persona 3 FES, Perfeito"), "PS2")).toBe(0);
  });

  it("removes only known CeX annotations", () => {
    expect(stripCexReferenceAnnotations("The Good Life")).toBe("The Good Life");
    expect(stripCexReferenceAnnotations("Last Of Us, The (Sem DLC)")).toBe("Last Of Us, The");
    expect(stripCexReferenceAnnotations("DuckTales (Disney's), + Manual, Caixa")).toBe("DuckTales");
  });

  it("strips packaging-only parentheses without changing the game identity", () => {
    expect(stripCexReferenceAnnotations("Mario Kart Wii (Cardboard Sleeve)")).toBe("Mario Kart Wii");
    expect(stripCexReferenceAnnotations("Mario Kart Wii (Solo Jogo, Normal DVD Case)")).toBe("Mario Kart Wii");
  });

  it("recognizes the CeX rarity Perfeito grade so it is never treated as generic Loose pricing", () => {
    expect(isCexPerfectGrade("Persona 4 (Com CD), Perfeito")).toBe(true);
    expect(isCexPerfectGrade("Persona 4")).toBe(false);
  });
});
