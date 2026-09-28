import { describe, expect, it } from "vitest";
import { getBestPlaytime } from "./playtime-summary.logic";

describe("best playtime summary", () => {
  it("prefers Main Story when present", () => {
    expect(getBestPlaytime({ main: "8 h", extras: "12 h", completionist: "20 h" })).toEqual({ category: "Main Story", value: "8 h" });
  });

  it("promotes Main + Extras or Completionist when earlier tiers are missing", () => {
    expect(getBestPlaytime({ main: "", extras: "6 h", completionist: "21 h" })).toEqual({ category: "Main + Extras", value: "6 h" });
    expect(getBestPlaytime({ main: "", extras: "", completionist: "21 h" })).toEqual({ category: "Completionist", value: "21 h" });
  });

  it("returns no summary for empty or missing IGDB values", () => {
    expect(getBestPlaytime({ main: " ", extras: "", completionist: null })).toBeNull();
    expect(getBestPlaytime(null)).toBeNull();
  });
});
