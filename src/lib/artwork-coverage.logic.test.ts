import { describe, expect, it } from "vitest";
import { summarizeArtworkCoverage } from "./artwork-coverage.logic";

describe("artwork coverage", () => {
  it("counts safe artwork and deliberate placeholders", () => {
    expect(summarizeArtworkCoverage([true, false, true, false])).toEqual({
      total: 4,
      safe: 2,
      placeholder: 2,
      percent: 50,
    });
  });

  it("handles an empty set", () => {
    expect(summarizeArtworkCoverage([])).toEqual({ total: 0, safe: 0, placeholder: 0, percent: 0 });
  });
});
