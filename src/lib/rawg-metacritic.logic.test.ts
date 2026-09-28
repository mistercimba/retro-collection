import { describe, expect, it } from "vitest";
import { selectRawgMetascore, selectRawgSearchGame, type RawgGameDetails, type RawgSearchGame } from "./rawg-metacritic.logic";

const ps1 = { platform: { name: "PlayStation" } };
const ps2 = { platform: { name: "PlayStation 2" } };
const rawgGame = (id: number, name: string, platforms: RawgSearchGame["platforms"]): RawgSearchGame => ({ id, name, platforms });

describe("RAWG title/platform Metascore selection", () => {
  it("selects Silent Hill for PlayStation and its PlayStation-specific Metascore", () => {
    const search = selectRawgSearchGame("Silent Hill", ["PlayStation"], [
      rawgGame(1, "Silent Hill", [ps2]),
      rawgGame(2, "Silent Hill", [ps1]),
    ]);
    expect(search).toEqual({ status: "matched", game: expect.objectContaining({ id: 2 }) });
    if (search.status !== "matched") throw new Error("Expected a unique PS1 result");

    const detail: RawgGameDetails = {
      metacritic: 86,
      metacritic_url: "https://www.metacritic.com/game/silent-hill/",
      metacritic_platforms: [
        { metascore: 86, url: "https://www.metacritic.com/game/silent-hill/critic-reviews/?platform=playstation", platform: { name: "PlayStation" } },
        { metascore: 87, platform: { name: "PC" } },
      ],
    };
    expect(selectRawgMetascore(detail, ["PlayStation"])).toEqual({
      value: 86,
      url: "https://www.metacritic.com/game/silent-hill/critic-reviews/?platform=playstation",
    });
  });

  it("rejects a title match present only on another platform", () => {
    expect(selectRawgSearchGame("Silent Hill", ["PlayStation"], [rawgGame(1, "Silent Hill", [ps2])]))
      .toEqual({ status: "unmatched", reason: "title-platform-mismatch" });
  });

  it("keeps multiple valid title and platform results ambiguous", () => {
    expect(selectRawgSearchGame("Silent Hill", ["PlayStation"], [
      rawgGame(1, "Silent Hill", [ps1]),
      rawgGame(2, "Silent Hill", [ps1]),
    ])).toMatchObject({ status: "ambiguous", games: [{ id: 1 }, { id: 2 }] });
  });

  it("returns null when RAWG detail has no Metascore", () => {
    expect(selectRawgMetascore({ platforms: [ps1] }, ["PlayStation"])).toBeNull();
  });

  it("uses a global Metascore only for a single matching RAWG platform", () => {
    expect(selectRawgMetascore({ metacritic: 82, platforms: [ps1] }, ["PlayStation"]))
      .toEqual({ value: 82, url: "" });
    expect(selectRawgMetascore({ metacritic: 82, platforms: [ps1, ps2] }, ["PlayStation"])).toBeNull();
    expect(selectRawgMetascore({ metacritic: 82 }, ["PlayStation"])).toBeNull();
  });

  it("supports compact canonical titles without accepting longer related titles", () => {
    expect(selectRawgSearchGame("Choro Q", ["PlayStation 2"], [rawgGame(5, "ChoroQ", [ps2])]))
      .toEqual({ status: "matched", game: expect.objectContaining({ id: 5 }) });
    expect(selectRawgSearchGame("Choro Q", ["PlayStation 2"], [rawgGame(6, "ChoroQ HG 4", [ps2])]))
      .toEqual({ status: "unmatched", reason: "no-title-match" });
  });
});
