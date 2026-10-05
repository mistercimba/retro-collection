import { describe, expect, it } from "vitest";
import type { CollectionGame, CollectionList } from "@/lib/data/types";
import { collectionListProgressPercent, hasCollectionListTarget, resolveCollectionList } from "./collection-lists.logic";

function game(overrides: Partial<CollectionGame> = {}): CollectionGame {
  return {
    collectionId: "DS-0001", catalogId: "", itemType: "Game", title: "Professor Layton e a Vila Misteriosa",
    platform: "Nintendo DS", edition: "Standard", region: "PAL", language: "PT", media: "Yes", box: "Yes",
    manual: "Yes", extras: "", label: "", sealed: "No", overallStatus: "CIB", conditionGrade: "Good",
    keepStatus: "Collection", acquiredDate: "", purchaseId: "", allocatedCostEur: null, marketValueEur: null,
    cexCashEur: null, needsReview: false, migrationConfidence: "App", notes: "", legacyName: "", audit: null, ...overrides,
  };
}

const list: CollectionList = {
  id: "LIST-1", name: "Professor Layton", description: "", createdAt: "2026-10-05T00:00:00.000Z",
  targets: [
    { id: "T-1", title: "Professor Layton e a Vila Misteriosa", platform: "Nintendo DS" },
    { id: "T-2", title: "Professor Layton e a Caixa de Pandora", platform: "Nintendo DS" },
  ],
};

describe("collection lists / goals", () => {
  it("resolves ownership by exact normalized title + platform only", () => {
    const resolved = resolveCollectionList(list, [
      game({ title: "Professor Layton e a Vila Misteriosa" }),
      game({ collectionId: "DS-0002", title: "Professor Layton e a Caixa de Pandora", platform: "Nintendo 3DS" }),
    ]);
    expect(resolved.ownedCount).toBe(1);
    expect(resolved.targets[0].ownedGame?.collectionId).toBe("DS-0001");
    expect(resolved.targets[1].ownedGame).toBeNull();
  });

  it("does not count Sell or Sold records as owned goal progress", () => {
    const resolved = resolveCollectionList(list, [
      game({ keepStatus: "Sell" }),
      game({ collectionId: "DS-0002", title: "Professor Layton e a Caixa de Pandora", keepStatus: "Sold" }),
    ]);
    expect(resolved.ownedCount).toBe(0);
  });

  it("prevents duplicate target identities while tolerating spacing", () => {
    expect(hasCollectionListTarget(list, { title: "Professor   Layton e a Vila Misteriosa", platform: "Nintendo DS" })).toBe(true);
    expect(hasCollectionListTarget(list, { title: "Professor Layton e a Vila Misteriosa", platform: "Nintendo 3DS" })).toBe(false);
  });

  it("calculates bounded owned/target progress", () => {
    expect(collectionListProgressPercent(3, 4)).toBe(75);
    expect(collectionListProgressPercent(0, 0)).toBe(0);
    expect(collectionListProgressPercent(5, 4)).toBe(100);
  });
});
