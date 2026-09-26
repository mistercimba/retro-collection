import { describe, expect, it } from "vitest";
import { joinCollectionWithAudit, parseAuditRow, parseCollectionRow, parseEuro } from "./parsers";
import { platformFromSlug, platformSlug } from "./platforms";

it("parses Portuguese euro values", () => {
  expect(parseEuro("€ 1.234,56")).toBe(1234.56);
  expect(parseEuro("35,00")).toBe(35);
  expect(parseEuro("")).toBeNull();
});

it("parses a collection row defensively", () => {
  const item = parseCollectionRow({ "Collection ID": " PS2-1 ", Title: "Silent Hill 2", "Market Value EUR": "86,00", "Needs Review": "Yes" });
  expect(item.collectionId).toBe("PS2-1");
  expect(item.marketValueEur).toBe(86);
  expect(item.needsReview).toBe(true);
  expect(item.region).toBe("");
});

it("joins audit records by exact Collection ID", () => {
  const item = parseCollectionRow({ "Collection ID": "A", Title: "Game" });
  const audit = parseAuditRow({ "Collection ID": "A", "Product Code": "SLES-1" });
  const joined = joinCollectionWithAudit([item], [audit]);
  expect(joined[0].audit?.productCode).toBe("SLES-1");
});

describe("platform slugs", () => {
  it("uses stable known slugs", () => expect(platformSlug("Playstation 2")).toBe("ps2"));
  it("round trips a slug", () => expect(platformFromSlug("n64", ["NES", "Nintendo 64"])).toBe("Nintendo 64"));
});
