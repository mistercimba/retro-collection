import { describe, expect, it } from "vitest";
import type { CollectionGame, ComponentNeed } from "./data/types";
import {
  buildComponentNeedEntries,
  buildComponentNeedHistory,
  recomputeCopyCompletion,
} from "./component-needs.logic";

function game(overrides: Partial<CollectionGame> = {}): CollectionGame {
  return {
    collectionId: "PS2-0001",
    catalogId: "",
    itemType: "Game",
    title: "Silent Hill 2",
    platform: "Playstation 2",
    edition: "Standard",
    region: "PAL",
    language: "English",
    media: "Yes",
    box: "No",
    manual: "No",
    extras: "",
    label: "",
    sealed: "No",
    overallStatus: "Incomplete",
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
    legacyName: "Silent Hill 2",
    audit: null,
    ...overrides,
  };
}

function need(overrides: Partial<ComponentNeed> = {}): ComponentNeed {
  return {
    id: "CN-1",
    collectionId: "PS2-0001",
    componentKey: "box",
    label: "Caixa",
    status: "found",
    notes: "",
    createdAt: "2026-10-06T20:00:00.000Z",
    updatedAt: "2026-10-06T20:00:00.000Z",
    completedAt: "",
    ...overrides,
  };
}

describe("component completion queue", () => {
  it("immediately infers missing base components from the physical copy", () => {
    const entries = buildComponentNeedEntries([game()], []);
    expect(entries.map((entry) => [entry.componentKey, entry.inferred])).toEqual([
      ["box", true],
      ["manual", true],
    ]);
  });

  it("uses the persisted workflow item instead of duplicating an inferred need", () => {
    const entries = buildComponentNeedEntries([game()], [need()]);
    expect(entries.filter((entry) => entry.componentKey === "box")).toHaveLength(1);
    expect(entries.find((entry) => entry.componentKey === "box")?.status).toBe("found");
    expect(entries.find((entry) => entry.componentKey === "manual")?.inferred).toBe(true);
  });

  it("keeps multiple physical copies independent", () => {
    const entries = buildComponentNeedEntries([
      game(),
      game({ collectionId: "PS2-0002", box: "Yes", manual: "No" }),
    ], []);
    expect(entries.map((entry) => entry.collectionId + ":" + entry.componentKey)).toEqual([
      "PS2-0001:box",
      "PS2-0001:manual",
      "PS2-0002:manual",
    ]);
  });

  it("keeps completed items only in history", () => {
    const completed = need({ status: "received", completedAt: "2026-10-06T21:00:00.000Z" });
    expect(buildComponentNeedEntries([game({ box: "Yes" })], [completed]).map((entry) => entry.componentKey)).toEqual(["manual"]);
    expect(buildComponentNeedHistory([game()], [completed])).toHaveLength(1);
  });

  it("recomputes CIB only when base and explicit custom needs are complete", () => {
    const complete = game({ box: "Yes", manual: "Yes", overallStatus: "Incomplete" });
    expect(recomputeCopyCompletion(complete, []).overallStatus).toBe("CIB");

    const custom = need({ id: "CN-X", componentKey: "custom", label: "Mapa", status: "missing" });
    expect(recomputeCopyCompletion(complete, [custom]).overallStatus).toBe("Incomplete");
  });
});
