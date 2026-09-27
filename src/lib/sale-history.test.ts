import { describe, expect, it } from "vitest";
import { parseSaleNoteFacts } from "./sale-history";

describe("parseSaleNoteFacts", () => {
  it("extracts only explicit date and amount from the recorded sale sentence", () => {
    expect(parseSaleNoteFacts("Audited 2026-09-24. Sold by owner on 2026-09-25 for €5.00."))
      .toEqual({ date: "2026-09-25", priceEur: 5 });
  });

  it("does not treat acquisition dates or market estimates as sale facts", () => {
    expect(parseSaleNoteFacts("Acquired 2026-09-24. Current value estimate: €15.00."))
      .toEqual({ date: null, priceEur: null });
  });
});
