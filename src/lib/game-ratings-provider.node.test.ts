import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectNewGameRatings, RatingsProviderFailure } from "./game-ratings-provider.node";

const searchMock = vi.hoisted(() => vi.fn());
vi.mock("howlongtobeat-ts", () => ({
  HowLongToBeatService: class { search() { return searchMock(); } },
  toHours: (seconds: number) => seconds / 3600,
}));

beforeEach(() => {
  searchMock.mockReset();
  searchMock.mockResolvedValue({ success: false, kind: "http", status: 404, error: "simulated" });
});
afterEach(() => { vi.restoreAllMocks(); });

describe("provider outage safety", () => {
  it("stops maintenance immediately with a safe typed failure", async () => {
    await expect(collectNewGameRatings("Nioh", "Playstation 4", {
      hltb: true, metacritic: false, strict: true,
    })).rejects.toBeInstanceOf(RatingsProviderFailure);
  });
  it("saves transient error status instead of a final lookup when adding a new game", async () => {
    const result = await collectNewGameRatings("Nioh", "Playstation 4", {
      hltb: true, metacritic: false,
    });
    expect(result.hltb.status).toBe("error");
    expect(result.hltb.mainHours).toBeNull();
    expect(result.lookupVersion).toBe(2);
  });
  it("updates HLTB without any RAWG network request", async () => {
    searchMock.mockResolvedValueOnce({
      success: true, data: [{ id: 184, name: "Hades", mainTime: 86400 }],
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("RAWG offline"));
    const result = await collectNewGameRatings("Hades", "PC", {
      hltb: true, metacritic: false, strict: true,
    });
    expect(result.hltb.mainHours).toBe(24);
    expect(result.metacritic.score).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("updates RAWG without contacting HLTB", async () => {
    const previous = process.env.RAWG_API_KEY;
    process.env.RAWG_API_KEY = "unit-test-key";
    const response = (value: object) => Promise.resolve(new Response(JSON.stringify(value), { status: 200 }));
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => response({ results: [
        { id: 184, name: "Hades", platforms: [{ platform: { name: "PC" } }] },
      ] }))
      .mockImplementationOnce(() => response({
        id: 184, name: "Hades", slug: "hades",
        platforms: [{ platform: { name: "PC" } }],
        metacritic_platforms: [{
          metascore: 91, platform: { name: "PC" }, url: "https://www.metacritic.com/game/hades/",
        }],
      }));
    try {
      const result = await collectNewGameRatings("Hades", "PC", {
        hltb: false, metacritic: true, strict: true,
      });
      expect(result.metacritic.score).toBe(91);
      expect(searchMock).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      if (previous === undefined) delete process.env.RAWG_API_KEY;
      else process.env.RAWG_API_KEY = previous;
    }
  });
});
