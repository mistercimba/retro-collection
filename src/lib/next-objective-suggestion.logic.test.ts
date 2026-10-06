import { describe, expect, it } from "vitest";
import type { CollectionGame, CollectionList, WantListEntry } from "./data/types";
import { suggestNextObjective } from "./next-objective-suggestion.logic";

function target(overrides: Partial<WantListEntry> = {}): WantListEntry {
  return {
    platform: "Playstation",
    priority: "Média",
    targetId: "W-1",
    title: "Final Fantasy VIII",
    reason: "",
    targetVersion: "PAL · CIB",
    priceCeilingEur: null,
    status: "ACTIVE",
    notes: "",
    ownedGame: null,
    possibleMatch: null,
    planState: "active",
    matchState: "missing",
    matchReason: "missing",
    purchase: null,
    ...overrides,
  };
}

function game(title: string, collectionId: string): CollectionGame {
  return {
    collectionId,
    catalogId: "",
    itemType: "Game",
    title,
    platform: "Playstation",
    edition: "Standard",
    region: "PAL",
    language: "English",
    media: "Yes",
    box: "Yes",
    manual: "Yes",
    extras: "",
    label: "",
    sealed: "No",
    overallStatus: "CIB",
    conditionGrade: "Good",
    keepStatus: "Collection",
    acquiredDate: "",
    purchaseId: "",
    allocatedCostEur: null,
    marketValueEur: null,
    cexCashEur: null,
    needsReview: false,
    migrationConfidence: "",
    notes: "",
    legacyName: title,
    audit: null,
  };
}

describe("next objective suggestion", () => {
  it("strongly prefers a target that completes a user-defined list", () => {
    const list: CollectionList = {
      id: "L-1",
      name: "Final Fantasy PS1",
      description: "",
      createdAt: "",
      targets: [
        { id: "A", title: "Final Fantasy VII", platform: "Playstation" },
        { id: "B", title: "Final Fantasy VIII", platform: "Playstation" },
      ],
    };
    const suggestion = suggestNextObjective(
      [target(), target({ targetId: "W-2", title: "Metal Gear Solid", priority: "Grail" })],
      [game("Final Fantasy VII", "PS1-1")],
      [list],
    );
    expect(suggestion?.target.title).toBe("Final Fantasy VIII");
    expect(suggestion?.kind).toBe("list-completion");
    expect(suggestion?.reason).toContain("Completa a lista");
  });

  it("can suggest the next game in a series already represented in the collection", () => {
    const suggestion = suggestNextObjective(
      [target(), target({ targetId: "W-2", title: "Vagrant Story" })],
      [game("Final Fantasy VII", "PS1-1"), game("Final Fantasy IX", "PS1-2")],
      [],
    );
    expect(suggestion?.target.title).toBe("Final Fantasy VIII");
    expect(suggestion?.kind).toBe("series");
    expect(suggestion?.reason).toContain("2 jogos");
  });

  it("falls back to explicit wishlist priority rather than a hardcoded must-have list", () => {
    const suggestion = suggestNextObjective(
      [target({ priority: "Média" }), target({ targetId: "W-2", title: "Suikoden II", priority: "Grail" })],
      [],
      [],
    );
    expect(suggestion?.target.title).toBe("Suikoden II");
    expect(suggestion?.kind).toBe("priority");
  });

  it("does not suggest the current objective or ordered targets", () => {
    const suggestion = suggestNextObjective(
      [
        target(),
        target({ targetId: "W-2", title: "Final Fantasy IX", priority: "Alta", acquisition: { state: "ordered", purchaseId: "P-1", orderedAt: "" } }),
      ],
      [game("Final Fantasy VII", "PS1-1")],
      [],
      "W-1",
    );
    expect(suggestion).toBeNull();
  });
});
