import { describe, it, expect } from "vitest";
import { emptyRatings, positiveMainHours, ratingScore, selectHltbMainStory, selectRawgGame, selectRawgMetascore, conservativeSearchTitles } from "./game-ratings.logic";

describe("one-time externally sourced game ratings", () => {
  it("matches an exact HLTB title and main story only", () => {
    expect(selectHltbMainStory("Resident Evil 4: Wii Edition", [
      { id: "23", name: "Resident Evil 4", gameplayMain: 14 },
      { id: "25", name: "Resident Evil 4: Wii Edition", gameplayMain: 15.5 },
    ])).toEqual({ mainHours: 15.5, gameId: "25", status: "matched" });
    expect(selectHltbMainStory("Resident Evil 4: Wii Edition", [
      { id: "23", name: "Resident Evil 4", gameplayMain: 14 },
    ]).mainHours).toBeNull();
    expect(selectHltbMainStory("A", [{ id: "1", name: "A", gameplayMain: 12 }, { id: "2", name: "A", gameplayMain: 13 }]).status).toBe("ambiguous");
  });
  it("does not accept invalid numbers or fake source identifiers", () => {
    expect(positiveMainHours(0)).toBeNull();
    expect(positiveMainHours(NaN)).toBeNull();
    expect(ratingScore(91.3)).toBeNull();
    expect(ratingScore(101)).toBeNull();
    expect(selectHltbMainStory("A", [{ id: "not-an-id", name: "A", gameplayMain: 12 }]).mainHours).toBeNull();
  });
  const sample = [
    { id: 4, name: "Resident Evil 4: Wii Edition", platforms: [{ platform: { name: "Wii" } }] },
    { id: 7, name: "Resident Evil 4", platforms: [{ platform: { name: "PlayStation 2" } }] },
  ];
  it("requires exact RAWG platform and title", () => {
    expect(selectRawgGame("Resident Evil 4: Wii Edition", "Nintendo Wii", sample)?.id).toBe(4);
    expect(selectRawgGame("Resident Evil 4: Wii Edition", "Playstation 2", sample)).toBeNull();
    expect(selectRawgGame("Resident Evil 4", "Nintendo Wii", sample)).toBeNull();
  });
  it("only accepts specific-platform scores or uniquely single-platform scores", () => {
    const wii = { slug: "re4-wii", name: "Resident Evil 4: Wii Edition", platforms: [{ platform: { name: "Wii" } }, { platform: { name: "PlayStation 2" } }] };
    expect(selectRawgMetascore("Nintendo Wii", { ...wii, metacritic: 91,
      metacritic_platforms: [{ platform: { name: "Wii" }, metascore: 84, url: "https://www.metacritic.com/game/re4/" }] })
    ).toEqual({ score: 84, status: "matched", url: "https://www.metacritic.com/game/re4/", rawgUrl: "https://rawg.io/games/re4-wii" });
    expect(selectRawgMetascore("Nintendo Wii", { ...wii, metacritic: 91 }).score).toBeNull();
    expect(selectRawgMetascore("Nintendo Wii", { ...wii, platforms: [{ platform: { name: "Wii" } }], metacritic: 91 }).score).toBe(91);
    expect(selectRawgMetascore("Nintendo Wii", { ...wii, metacritic_platforms: [
      { platform: { name: "Wii" }, metascore: 84 }, { platform: { name: "Wii" }, metascore: 92 },
    ] }).status).toBe("ambiguous");
    expect(selectRawgMetascore("Nintendo Wii", { ...wii, metacritic_platforms: [
      { platform: { name: "Wii" }, metascore: 84, url: "javascript:alert(1)" },
    ] }).url).toBeNull();
  });
  it("defaults to missing ratings without provider requests", () => {
    const blank = emptyRatings("2026-10-17T00:00:00.000Z");
    expect(blank.hltb.mainHours).toBeNull();
    expect(blank.metacritic.score).toBeNull();
  });
});

describe("conservative real game edition aliases",()=>{
  it("only maps Wii-specific edition into a same-platform RAWG candidate",()=>{
    const title="Resident Evil 4: Wii Edition";
    expect(conservativeSearchTitles(title,"Nintendo Wii")).toEqual([title,"Resident Evil 4"]);
    expect(conservativeSearchTitles(title,"Playstation 2")).toEqual([title]);
    const candidates=[{id:42,name:"Resident Evil 4",platforms:[{platform:{name:"Wii"}}]}];
    expect(selectRawgGame(title,"Nintendo Wii",candidates)?.id).toBe(42);
    expect(selectRawgGame(title,"Playstation 2",candidates)).toBeNull();
  });
  it("matches a game labeled Version without conflating numbered sequels",()=>{
    expect(selectRawgGame("Pokémon LeafGreen","GameBoy Advance",[
      {id:1,name:"Pokémon LeafGreen Version",platforms:[{platform:{name:"Game Boy Advance"}}]},
    ])?.id).toBe(1);
    expect(selectRawgGame("Pokémon LeafGreen","GameBoy Advance",[
      {id:1,name:"Pokémon FireRed Version",platforms:[{platform:{name:"Game Boy Advance"}}]},
    ])).toBeNull();
  });
});
