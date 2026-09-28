import { describe, expect, it } from "vitest";
import { getSafeListReturnPath, listReturnLabel, parseListState, serializeListState } from "./list-url-state.logic";

describe("URL-backed list state", () => {
  const defaults = { q: "", platform: "", genre: "", review: false, sort: "title-asc" };

  it("parses and serializes meaningful filters while omitting defaults", () => {
    const state = parseListState("?q=Silent%20Hill&genre=Adventure&review=1&sort=value-desc", defaults);
    expect(state).toEqual({ q: "Silent Hill", platform: "", genre: "Adventure", review: true, sort: "value-desc" });
    expect(serializeListState(state, defaults)).toBe("q=Silent+Hill&genre=Adventure&review=1&sort=value-desc");
  });

  it("keeps only safe, same-site list return destinations", () => {
    expect(getSafeListReturnPath("/platform/ps2?genre=Action&review=1")).toBe("/platform/ps2?genre=Action&review=1");
    expect(getSafeListReturnPath("/search?q=Pokemon")).toBe("/search?q=Pokemon");
    expect(getSafeListReturnPath("https://example.com/steal")).toBeNull();
    expect(getSafeListReturnPath("//example.com/steal")).toBeNull();
    expect(getSafeListReturnPath("/login")).toBeNull();
  });

  it("labels the contextual return route", () => {
    expect(listReturnLabel("/collection/games?review=1", [])).toBe("Todos os jogos");
    expect(listReturnLabel("/want?sort=priority", [])).toBe("À procura");
    expect(listReturnLabel("/collection?q=Silent+Hill", [])).toBe("Coleção");
    expect(listReturnLabel("/platform/ps2", ["Playstation 2"])).toBe("PlayStation 2");
    expect(listReturnLabel("/search?q=Pokemon", [])).toBe("Resultados da pesquisa");
  });
});
