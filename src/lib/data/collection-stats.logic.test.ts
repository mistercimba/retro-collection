import { describe, expect, it } from "vitest";
import { sumKnownMarketValues } from "./collection-stats.logic";
import { formatEuro, gameCountLabel } from "../format";

describe("known collection values", () => {
  it("renders no valuations as unavailable, including an empty collection", () => {
    expect(sumKnownMarketValues([])).toBeNull();
    expect(formatEuro(sumKnownMarketValues([{ marketValueEur: null }]))).toBe("—");
  });
  it("sums known values without treating a real zero as unknown", () => {
    expect(sumKnownMarketValues([{ marketValueEur: 0 }, { marketValueEur: null }])).toBe(0);
    expect(sumKnownMarketValues([{ marketValueEur: 12.5 }, { marketValueEur: null }, { marketValueEur: 7.5 }])).toBe(20);
  });
  it("uses the same semantics for per-platform and overall values", () => {
    const unknown = [{ marketValueEur: null }];
    const partial = [{ marketValueEur: 5 }, { marketValueEur: null }];
    expect(sumKnownMarketValues(unknown)).toBeNull();
    expect(sumKnownMarketValues(partial)).toBe(5);
    expect(sumKnownMarketValues([...unknown, ...partial])).toBe(5);
  });
});

it("uses jogo only for a count of one", () => {
  expect(gameCountLabel(0)).toBe("0 jogos");
  expect(gameCountLabel(1)).toBe("1 jogo");
  expect(gameCountLabel(2)).toBe("2 jogos");
});
