import { describe, expect, it } from "vitest";
import { estimateCondition, exactUniqueMatch, formatPlaytime, lookupPalPricechartingMatch, normalizeMatchTitle, parseEcbUsdEur, selectPriceChartingPrice, selectSnapshotPrice } from "./external-game-data.logic";

describe("external game data matching and display", () => {
  it("normalizes accents but requires a unique exact title", () => {
    expect(normalizeMatchTitle("Pokémon: Red Version")).toBe("pokemon red version");
    expect(exactUniqueMatch("Pokémon", [{ name: "Pokemon" }])).toEqual({ status: "matched", candidate: { name: "Pokemon" } });
    expect(exactUniqueMatch("Sonic", [{ name: "Sonic" }, { name: "Sonic" }]).status).toBe("ambiguous");
    expect(exactUniqueMatch("Sonic", [{ name: "Sonic 2" }]).status).toBe("unmatched");
  });

  it("formats IGDB duration values and leaves missing values blank", () => {
    expect(formatPlaytime(3600 * 27)).toBe("1 d 3 h");
    expect(formatPlaytime(0)).toBe("");
  });

  it("reads the latest valid ECB USD/EUR rate and its actual observation date", () => {
    expect(parseEcbUsdEur("TIME_PERIOD,OBS_VALUE\n2026-09-24,1.17\n2026-09-25,\n")).toEqual({ rate: 1.17, date: "2026-09-24" });
    expect(parseEcbUsdEur("KEY,TIME_PERIOD,OBS_VALUE,OBS_STATUS,DECIMALS\nD.USD.EUR.SP00.A,2026-09-24,1.17,A,4\nD.USD.EUR.SP00.A,2026-09-25,1.18,A,4")).toEqual({ rate: 1.18, date: "2026-09-25" });
  });

  it("selects a condition-specific PriceCharting price in cents", () => {
    const product = { "loose-price": 2500, "cib-price": 5000, "new-price": 12000 };
    expect(selectPriceChartingPrice(product, false, true)).toEqual({ usd: 50, basis: "cib-price" });
    expect(selectPriceChartingPrice(product, true, true)).toEqual({ usd: 120, basis: "new-price" });
    expect(selectPriceChartingPrice(product, false, false)).toEqual({ usd: 25, basis: "loose-price" });
  });

  it("uses the validated private PAL snapshot schema and preserves safe aliases", () => {
    const product = { platform: "PS2", region: "PAL", title: "Sly 3: Honor Among Thieves", aliases: ["Sly 3"], pricechartingUrl: "https://www.pricecharting.com/game/pal-playstation-2/sly-3", loose: 12, cib: 24, new: 40, scrapedAt: "2026-09-01T00:00:00Z" };
    const catalog = { source: "pricecharting-pal-local-snapshot", region: "PAL", currency: "USD", generatedAt: "2026-09-01T00:00:00Z", games: [product] };
    expect(lookupPalPricechartingMatch(catalog, "Playstation 2", "Sly 3", "Standard")?.product).toBe(product);
    expect(lookupPalPricechartingMatch(catalog, "Playstation", "Sly 3", "Standard")).toBeNull();
    expect(lookupPalPricechartingMatch({ ...catalog, games: [product, { ...product, pricechartingUrl: "https://www.pricecharting.com/game/pal-playstation-2/sly-3-alt" }] }, "Playstation 2", "Sly 3", "Standard")).toBeNull();
    expect(lookupPalPricechartingMatch({ ...catalog, region: "NTSC" }, "Playstation 2", "Sly 3", "Standard")).toBeNull();
    expect(selectSnapshotPrice(product, "CIB")).toBe(24);
  });

  it("matches conservative PriceCharting title aliases used by the collection", () => {
    const persona = {
      platform: "PS2", region: "PAL", title: "Shin Megami Tensei: Persona 4",
      pricechartingUrl: "https://www.pricecharting.com/game/pal-playstation-2/shin-megami-tensei-persona-4",
      loose: 26.72, cib: 55.05, new: 101.91, scrapedAt: "2026-09-01T00:00:00Z",
    };
    const catalog = {
      source: "pricecharting-pal-local-snapshot", region: "PAL", currency: "USD",
      generatedAt: "2026-09-01T00:00:00Z", games: [persona],
    };
    expect(lookupPalPricechartingMatch(catalog, "Playstation 2", "Persona 4", "Standard")?.product).toBe(persona);
  });

  it("supports PAL PS3 and PS5 snapshot URLs once those platform snapshots are available", () => {
    const ps3 = {
      platform: "PS3", region: "PAL", title: "The Last of Us",
      pricechartingUrl: "https://www.pricecharting.com/game/pal-playstation-3/the-last-of-us",
      loose: 5, cib: 8, new: 20, scrapedAt: "2026-10-02T00:00:00Z",
    };
    const ps5 = {
      platform: "PS5", region: "PAL", title: "Returnal",
      pricechartingUrl: "https://www.pricecharting.com/game/pal-playstation-5/returnal",
      loose: 10, cib: 14, new: 22, scrapedAt: "2026-10-02T00:00:00Z",
    };
    const catalog = {
      source: "pricecharting-pal-local-snapshot", region: "PAL", currency: "USD",
      generatedAt: "2026-10-02T00:00:00Z", games: [ps3, ps5],
    };
    expect(lookupPalPricechartingMatch(catalog, "Playstation 3", "The Last of Us", "Standard")?.product).toBe(ps3);
    expect(lookupPalPricechartingMatch(catalog, "Playstation 5", "Returnal", "Standard")?.product).toBe(ps5);
  });

  it("uses only explicit copy data to select New, CIB or Loose", () => {
    expect(estimateCondition({ sealed: "Yes", media: "Yes", box: "Yes", manual: "Yes" })).toMatchObject({ label: "New" });
    expect(estimateCondition({ sealed: "No", media: "Yes", box: "Yes", manual: "Yes" })).toMatchObject({ label: "CIB" });
    expect(estimateCondition({ sealed: "No", media: "Yes", box: "No", manual: "No" })).toMatchObject({ label: "Loose" });
    expect(estimateCondition({ sealed: "", media: "Yes", box: "Yes", manual: "Yes" })).toBeNull();
  });
});
