import { describe, expect, it } from "vitest";
import {
  buildCatalogSearchBodies,
  catalogTitleMatchesQuery,
  escapeIgdbSearch,
  hasEuropeanReleaseOnPlatform,
  isCatalogGameType,
  mapIgdbCandidates,
  normalizeCatalogSearch,
  parseIgdbIdentifier,
  rankCatalogMatch,
} from "./igdb-catalog.logic";

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
      release_dates: [{ platform: 8, release_region: 1 }],
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
      release_dates: [{ platform: 8, release_region: 2 }, { platform: 9, release_region: 1 }],
    }];
    expect(mapIgdbCandidates(games, "Playstation 3").map((item) => item.platform)).toEqual(["Playstation 3"]);
  });
  it("scopes console searches in IGDB before the 100-result limit", () => {
    const ds = buildCatalogSearchBodies("pokemon", "Nintendo DS");
    expect(ds?.primary).toContain("platforms = (20)");
    expect(ds?.primary).toContain("game_type = (0,3,4,8,9,10,11)");
    expect(ds?.primary).toContain("involved_companies != null");
    expect(ds?.primary).toContain("release_dates.release_region = 1");
    expect(ds?.primary).toContain('search "pokemon"');
    expect(ds?.primary).toContain("limit 100;");
    expect(ds?.fallback).toBeNull();
    const broad = buildCatalogSearchBodies("pokemon")!;
    expect(broad.primary).toContain("platforms = (");
    expect(broad.primary).not.toContain("platforms = (6,");
    const platformScope = broad.primary.match(/platforms = \(([^)]+)\)/)?.[1]?.split(",") ?? [];
    expect(platformScope).not.toContain("6");
    expect(platformScope).toContain("20");
    expect(buildCatalogSearchBodies("pokemon", "PC")?.primary).toContain("platforms = (6)");
    expect(buildCatalogSearchBodies("pokemon", "Made Up")).toBeNull();
  });

  it("adds bounded partial-word recovery for multiword names, without guessing from a prefix", () => {
    const search = buildCatalogSearchBodies("pokemon hear", "Nintendo DS")!;
    expect(search.primary).toContain('search "pokemon hear"');
    expect(search.fallback).toContain('name ~ *"hear"*');
    expect(search.fallback).toContain("platforms = (20)");
    expect(search.fallback).toContain("release_dates.release_region = 1");
    expect(catalogTitleMatchesQuery("Pokémon HeartGold Version", "pokemon hear")).toBe(true);
    expect(catalogTitleMatchesQuery("Pokémon White Version 2", "pokemon hear")).toBe(false);
    expect(catalogTitleMatchesQuery("Pokémon HeartGold Version", "pokemon heartgold")).toBe(true);
    expect(normalizeCatalogSearch("Pokémon HeartGold Version")).toBe("pokemon heartgold version");
    expect(rankCatalogMatch("Pokémon HeartGold Version", "pokemon heartgold")).toBe(1);
    expect(rankCatalogMatch("Pokémon SoulSilver", "pokemon hear")).toBe(3);
  });

  it("excludes mod and fork categories, including when someone requests an exact game ID", () => {
    for (const kind of [5, 12, 1, 2, 6, 7, 13, 14]) {
      expect(isCatalogGameType({ game_type: kind })).toBe(false);
    }
    for (const kind of [0, 3, 4, 8, 9, 10, 11]) {
      expect(isCatalogGameType({ game_type: kind })).toBe(true);
    }
    expect(isCatalogGameType({ category: 5 })).toBe(false);
    expect(isCatalogGameType({ game_type: 0, category: 5 })).toBe(true);
    expect(mapIgdbCandidates([{
      id: 19, name: "Unofficial hack", game_type: 5,
      platforms: [{ id: 20 }],
      involved_companies: [{ publisher: true, company: { name: "Fake Studio" } }],
    }])).toEqual([]);
    const lookup = buildCatalogSearchBodies("IGDB: 19500", "Nintendo DS");
    expect(lookup?.primary).toContain("where id = 19500;");
    expect(lookup?.fallback).toBeNull();
  });

  it("shows published physical-console games, but not unverified/fan and PC-only noise by default", () => {
    const games = [
      { id: 1, name: "Pokémon HeartGold Version", game_type: 0,
        platforms: [{ id: 20, name: "Nintendo DS" }],
        release_dates: [{ platform: 20, release_region: 1 }],
        involved_companies: [{ publisher: true, company: { name: "Nintendo" } }] },
      { id: 2, name: "Pokémon Fan Project", game_type: 0,
        platforms: [{ id: 24 }],
        release_dates: [{ platform: 24, release_region: 1 }],
        involved_companies: [] },
      { id: 3, name: "Pokémon Fan PC", game_type: 0,
        platforms: [{ id: 6 }],
        release_dates: [{ platform: 6, release_region: 1 }],
        involved_companies: [{ publisher: true, company: { name: "Indie Team" } }] },
      { id: 4, name: "Pokémon Gold Bundle", game_type: 3, version_title: "Gold Bundle",
        platforms: [{ id: 20 }],
        release_dates: [{ platform: 20, release_region: 1 }],
        involved_companies: [{ publisher: true, company: { name: "Nintendo" } }] },
    ];
    expect(mapIgdbCandidates(games, "", { requirePublisher: true, consolesOnly: true })
      .map((result) => [result.gameId, result.platform, result.edition]))
      .toEqual([[4, "Nintendo DS", "Gold Bundle"], [1, "Nintendo DS", "Standard"]]);
    expect(mapIgdbCandidates(games, "PC", { requirePublisher: true }).map((result) => result.gameId)).toEqual([3]);
    expect(mapIgdbCandidates(games).some((result) => result.gameId === 2)).toBe(true);
  });

  it("rejects Mega Man Star Force 3 Black Ace/Red Joker without Europe DS releases, preserving confirmed Europe releases", () => {
    const publisher = [{ publisher: true, company: { name: "Capcom" } }];
    const games = [
      {
        id: 3001, name: "Mega Man Star Force 3: Black Ace", game_type: 0,
        platforms: [{ id: 20, name: "Nintendo DS" }],
        involved_companies: publisher,
        release_dates: [{ platform: 20, release_region: 5 }, { platform: 20, release_region: 2 }],
      },
      {
        id: 3002, name: "Mega Man Star Force 3: Red Joker", game_type: 0,
        platforms: [{ id: 20, name: "Nintendo DS" }],
        involved_companies: publisher,
        release_dates: [{ platform: 20, release_region: 5 }, { platform: 20, release_region: 2 }],
      },
      {
        id: 3003, name: "Mega Man Star Force: Leo", game_type: 0,
        platforms: [{ id: 20, name: "Nintendo DS" }],
        involved_companies: publisher,
        release_dates: [{ platform: 20, release_region: 2 }, { platform: 20, release_region: 1 }],
      },
      {
        id: 3004, name: "Mega Man Star Force 2: Zerker x Ninja", game_type: 0,
        platforms: [{ id: 20, name: "Nintendo DS" }],
        involved_companies: publisher,
        release_dates: [{ platform: 20, release_region: 1 }],
      },
    ];
    expect(mapIgdbCandidates(games, "Nintendo DS", { requirePublisher: true }).map((g) => g.title)).toEqual([
      "Mega Man Star Force 2: Zerker x Ninja",
      "Mega Man Star Force: Leo",
    ]);
    // An explicit ID is not a bypass: the selected game still maps to zero
    // valid European platform identities before any server-side insertion.
    expect(mapIgdbCandidates([games[0]], "Nintendo DS")).toEqual([]);
    expect(mapIgdbCandidates([games[2]], "Nintendo DS")).toHaveLength(1);
  });

  it("requires Europe region 1 on the same platform, not just any PAL-ish or worldwide metadata", () => {
    const fake = (release_dates?: Array<{ platform?: number; release_region?: number; region?: number }>) => ({
      id: 77, name: "Example",
      first_release_date: 946684800,
      platforms: [{ id: 20, name: "Nintendo DS" }, { id: 21, name: "GameCube" }],
      release_dates,
    });
    const invalid = [
      undefined, [], [{ platform: 20, release_region: 2 }],
      [{ platform: 20, release_region: 5 }], [{ platform: 20, release_region: 3 }],
      [{ platform: 20, release_region: 8 }],
      [{ platform: 21, release_region: 1 }, { platform: 20, release_region: 2 }],
    ];
    for (const dates of invalid) {
      expect(hasEuropeanReleaseOnPlatform(fake(dates), 20)).toBe(false);
      expect(mapIgdbCandidates([fake(dates)], "Nintendo DS")).toEqual([]);
    }
    expect(hasEuropeanReleaseOnPlatform(fake([{ platform: 20, region: 1 }]), 20)).toBe(true);
    expect(hasEuropeanReleaseOnPlatform(fake([{ platform: 20, region: 1, release_region: 2 }]), 20)).toBe(false);
    const mixed = fake([{ platform: 21, release_region: 1 }, { platform: 20, release_region: 2 }]);
    expect(mapIgdbCandidates([mixed]).map((c) => c.platform)).toEqual(["GameCube"]);
    expect(mapIgdbCandidates([mixed], "Nintendo DS")).toEqual([]);
    expect(mapIgdbCandidates([mixed], "GameCube")).toHaveLength(1);
    expect(mapIgdbCandidates([fake([{ platform: 20, release_region: 1 }])], "Nintendo DS")).toHaveLength(1);
  });

  it("keeps one IGDB identity per distinct verified European platform, including separate game versions", () => {
    const games = [
      {
        id: 91, name: "Example: Gold", version_title: "Gold", platforms: [{ id: 20 }, { id: 21 }],
        release_dates: [{ platform: 20, release_region: 1 }, { platform: 21, release_region: 1 }],
      },
      {
        id: 92, name: "Example: Silver", version_title: "Silver", platforms: [{ id: 20 }],
        release_dates: [{ platform: 20, release_region: 2 }],
      },
    ];
    expect(mapIgdbCandidates(games).map((g) => [g.gameId, g.platform])).toEqual([
      [91, "GameCube"], [91, "Nintendo DS"],
    ]);
    expect(mapIgdbCandidates(games, "Nintendo DS").map((g) => g.edition)).toEqual(["Gold"]);
  });

});
