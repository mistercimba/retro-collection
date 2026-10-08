import { describe, expect, it } from "vitest";
import { buildWishlistMaintenancePreflight } from "./wishlist-maintenance-preflight.logic";
import type {
  WishlistMaintenanceLibrary,
  WishlistMaintenancePlan,
} from "../../scripts/wishlist-maintenance-logic.mjs";

function library(ordered = false): WishlistMaintenanceLibrary {
  const base = {
    platform: "Game Boy Color",
    priority: "Média",
    reason: "",
    targetVersion: "PAL",
    priceCeilingEur: null,
    status: "ACTIVE",
    notes: "SECRET_NOTE_DO_NOT_EXPORT",
  };
  return {
    schemaVersion: 1,
    updatedAt: "2026-10-08T09:00:00.000Z",
    collection: [],
    wishlist: [
      { ...base, targetId: "W-1", title: "Warlocked" },
      {
        ...base,
        targetId: "W-2",
        title: "Pokémon Black 2 ou White 2",
        platform: "Nintendo DS",
        notes: "", // This target is safe to split; a nonempty note must block it.
        acquisition: ordered ? { state: "ordered", purchaseId: "PUR-1", orderedAt: "2026-10-08T08:00:00Z" } : null,
      },
    ],
    purchases: [],
    valuations: [],
  };
}

const plan: WishlistMaintenancePlan = {
  schemaVersion: 1,
  id: "safe-preflight",
  operations: [
    { type: "remove", match: { title: "Warlocked", platform: "Game Boy Color" } },
    { type: "split", match: { title: "Pokémon Black 2 ou White 2", platform: "Nintendo DS" }, titles: ["Pokémon Black Version 2", "Pokémon White Version 2"] },
  ],
};

describe("Wishlist read-only preflight", () => {
  it("shows approved per-title notes and no notes blocker when live note matches the plan", () => {
    const expectedNotes = "Não é necessário comprar as duas versões de início.";
    const input = library();
    input.wishlist[1].notes = expectedNotes;
    const approvedPlan: WishlistMaintenancePlan = structuredClone(plan);
    const split = approvedPlan.operations[1];
    if (split.type !== "split") throw new Error("Expected split");
    split.expectedSourceNotes = expectedNotes;
    split.notesByTitle = {
      "Pokémon Black Version 2": expectedNotes + " Alternativa: White 2.",
      "Pokémon White Version 2": expectedNotes + " Alternativa: Black 2.",
    };
    const report = buildWishlistMaintenancePreflight(input, approvedPlan);
    expect(report.safeToApply).toBe(true);
    expect(report.operations[1].proposedNotes?.map((x) => x.notes)).toEqual([
      expectedNotes + " Alternativa: White 2.",
      expectedNotes + " Alternativa: Black 2.",
    ]);
  });

  it("reports exact live source IDs and new titles without changing the source", () => {
    const input = library();
    const before = structuredClone(input);
    const report = buildWishlistMaintenancePreflight(input, plan);
    expect(report.safeToApply).toBe(true);
    expect(report.sourceWishlistCount).toBe(2);
    expect(report.estimatedWishlistCount).toBe(2);
    expect(report.operations[0].existing[0].targetId).toBe("W-1");
    expect(report.operations[1].proposedTitles).toEqual(["Pokémon Black Version 2", "Pokémon White Version 2"]);
    expect(report.distinctTargetIdCount).toBe(2);
    expect(report.collidingTargetIds).toEqual([]);
    expect(report.nextObjective).toBeNull();
    expect(report.operations[1].existing[0]).toEqual({
      targetId: "W-2", title: "Pokémon Black 2 ou White 2", platform: "Nintendo DS", notes: "",
    });
    expect(input).toEqual(before);
    expect(JSON.stringify(report)).not.toContain("SECRET_NOTE_DO_NOT_EXPORT");
  });

  it("reports duplicate legacy IDs, distinct objective and exact split notes", () => {
    const input = library();
    input.wishlist[0].targetId = "NOVO";
    input.wishlist[1].targetId = "NOVO";
    input.wishlist[1].notes = "Preferir PAL";
    input.nextObjective = {
      targetId: "NOVO", title: "Warlocked", platform: "Game Boy Color",
      setAt: "2026-10-08T10:00:00.000Z",
    };
    const report = buildWishlistMaintenancePreflight(input, plan);
    expect(report.safeToApply).toBe(false);
    expect(report.collidingTargetIds).toEqual([{ targetId: "NOVO", count: 2 }]);
    expect(report.nextObjective?.title).toBe("Warlocked");
    expect(report.blockers.map((item) => item.code)).toEqual(["notes"]);
    expect(report.operations[1].existing[0]).toHaveProperty("notes", "Preferir PAL");
    expect(report.operations[0].existing[0]).not.toHaveProperty("notes");
  });

  it("reports ordered-target blockers and never promises a safe final count", () => {
    const report = buildWishlistMaintenancePreflight(library(true), plan);
    expect(report.safeToApply).toBe(false);
    expect(report.estimatedWishlistCount).toBeNull();
    expect(report.blockers.map((item) => item.code)).toContain("ordered-target");
  });
});
