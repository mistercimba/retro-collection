import { describe, expect, it } from "vitest";
import { collectIndividualGenres, splitGenres } from "./genre-filter.logic";

describe("individual genre filters", () => {
  it("splits and deduplicates a multi-genre game", () => {
    expect(splitGenres("Racing, Sport, Arcade")).toEqual(["Racing", "Sport", "Arcade"]);
    expect(collectIndividualGenres(["Racing, Sport, Arcade", "Sport, Arcade", "Puzzle"])).toEqual(["Arcade", "Puzzle", "Racing", "Sport"]);
  });

  it("ignores empty genre values", () => {
    expect(collectIndividualGenres(["", "  ", "Action, "])).toEqual(["Action"]);
  });
});
