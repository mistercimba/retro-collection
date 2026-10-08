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
  it("reports exact live source IDs and new titles without changing the source", () => {
    const input = library();
    const before = structuredClone(input);
    const report = buildWishlistMaintenancePreflight(input, plan);
    expect(report.safeToApply).toBe(true);
    expect(report.sourceWishlistCount).toBe(2);
    expect(report.estimatedWishlistCount).toBe(2);
    expect(report.operations[0].existing[0].targetId).toBe("W-1");
    expect(report.operations[1].proposedTitles).toEqual(["Pokémon Black Version 2", "Pokémon White Version 2"]);
    expect(input).toEqual(before);
    expect(JSON.stringify(report)).not.toContain("SECRET_NOTE_DO_NOT_EXPORT");
  });

  it("reports ordered-target blockers and never promises a safe final count", () => {
    const report = buildWishlistMaintenancePreflight(library(true), plan);
    expect(report.safeToApply).toBe(false);
    expect(report.estimatedWishlistCount).toBeNull();
    expect(report.blockers.map((item) => item.code)).toContain("ordered-target");
  });
});
