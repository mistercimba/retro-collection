import { expect, it } from "vitest";
import { MockProvider } from "./mock-provider";
import { joinCollectionWithAudit, parseAuditRow, parseCollectionRow } from "./parsers";

it("mock data produces usable collection statistics inputs", async () => {
  const raw = await new MockProvider().read();
  const games = joinCollectionWithAudit(raw.collection.map(parseCollectionRow), raw.audit.map(parseAuditRow));
  const kept = games.filter((game) => game.keepStatus === "Collection");
  expect(kept.length).toBeGreaterThan(5);
  expect(kept.some((game) => game.platform === "Playstation 2")).toBe(true);
  expect(games.some((game) => game.keepStatus === "Sell")).toBe(true);
});
