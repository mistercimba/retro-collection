import { describe, expect, it } from "vitest";
import type { NextCollectionObjective, WantListEntry } from "./data/types";
import { objectiveMatchesTarget, resolveNextObjective } from "./next-objective.logic";

function target(overrides: Partial<WantListEntry> = {}): WantListEntry {
  return {
    platform: "Playstation 2",
    priority: "Alta",
    targetId: "W-1",
    title: "Silent Hill 2",
    reason: "Quero uma boa cópia PAL",
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

const objective: NextCollectionObjective = {
  targetId: "W-1",
  title: "Silent Hill 2",
  platform: "Playstation 2",
  setAt: "2026-10-06T22:00:00.000Z",
};

describe("next objective", () => {
  it("resolves only the exact target identity", () => {
    const exact = target();
    const collision = target({ platform: "Playstation", title: "Silent Hill", targetId: "W-1" });
    expect(resolveNextObjective(objective, [collision, exact])).toBe(exact);
    expect(objectiveMatchesTarget(objective, exact)).toBe(true);
    expect(objectiveMatchesTarget(objective, collision)).toBe(false);
  });

  it("rejects an ordered target", () => {
    expect(resolveNextObjective(objective, [
      target({ acquisition: { state: "ordered", purchaseId: "APP-1", orderedAt: "2026-10-06T22:10:00.000Z" } }),
    ])).toBeNull();
  });

  it("rejects inactive or already acquired targets", () => {
    expect(resolveNextObjective(objective, [target({ planState: "inactive" })])).toBeNull();
    expect(resolveNextObjective(objective, [target({ matchState: "acquired" })])).toBeNull();
  });

  it("allows zero objectives", () => {
    expect(resolveNextObjective(null, [target()])).toBeNull();
  });
});
