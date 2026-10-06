import { describe, expect, it } from "vitest";
import { escapeIgdbSearch, mapIgdbCandidates, parseIgdbIdentifier } from "./igdb-catalog.logic";

describe("IGDB catalog logic", () => {
  it("recognizes explicit and bare IGDB ids", () => {
    expect(parseIgdbIdentifier("1068")).toBe(1068);
    expect(parseIgdbIdentifier("IGDB: 1068")).toBe(1068);
    expect(parseIgdbIdentifier("#1068")).toBe(1068);
    expect(parseIgdbIdentifier("Mario 64")).toBeNull();
  });

  it("escapes search strings for Apicalypse", () => {
    expect(escapeIgdbSearch('Tom "Test" \\ Jerry')).toBe('Tom \\"Test\\" \\\\ Jerry');
  });

  it("splits multi-platform games into supported local identities", () => {
    const result = mapIgdbCandidates([{
      id: 42,
      name: "Example",
      first_release_date: 946684800,
      version_title: "Collector",
      cover: { image_id: "cover42" },
      genres: [{ name: "Adventure" }],
      platforms: [{ id: 8, name: "PlayStation 2" }, { id: 9999, name: "Unknown" }],
      involved_companies: [
        { developer: true, company: { name: "Dev" } },
        { publisher: true, company: { name: "Pub" } },
      ],
    }]);

    expect(result).toEqual([expect.objectContaining({
      gameId: 42,
      platformId: 8,
      platform: "Playstation 2",
      title: "Example",
      edition: "Collector",
      coverImageId: "cover42",
      genres: ["Adventure"],
      developers: ["Dev"],
      publishers: ["Pub"],
    })]);
  });

  it("applies the local platform filter conservatively", () => {
    const games = [{
      id: 7,
      name: "Multi",
      platforms: [{ id: 8 }, { id: 9 }],
    }];
    expect(mapIgdbCandidates(games, "Playstation 3").map((item) => item.platform)).toEqual(["Playstation 3"]);
  });
});
