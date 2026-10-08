import { describe, expect, it } from "vitest";
import { maintenanceSnapshotConfirmed, prepareApprovedWishlistCleanup } from "./wishlist-maintenance-apply.logic";
import { buildWishlistMaintenancePreflight } from "./wishlist-maintenance-preflight.logic";
import type {
  WishlistMaintenanceLibrary,
  WishlistMaintenancePlan,
  WishlistMaintenanceTarget,
} from "../../scripts/wishlist-maintenance-logic.mjs";
import approvedPlan from "../../data/wishlist-maintenance-2026-10-08.json";

const plan = approvedPlan as WishlistMaintenancePlan;
const nowIso = "2026-10-08T10:00:00.000Z";
const sourceNotes = [
  "Confirmar código e autenticidade; não comprar repro.",
  "Escolher um; não é necessário comprar os dois.",
  "Não é necessário comprar as duas versões de início.",
];

function target(title: string, platform: string, notes = ""): WishlistMaintenanceTarget {
  return {
    platform,
    priority: "Média",
    targetId: "NOVO",
    title,
    reason: "",
    targetVersion: "PAL",
    priceCeilingEur: null,
    status: "ACTIVE",
    notes,
  };
}

function fixture(): WishlistMaintenanceLibrary {
  const wishlist: WishlistMaintenanceTarget[] = [
    target("Warlocked", "Game Boy Color"),
    ...Array.from({ length: 12 }, (_, i) => target("PS5-" + i, "Playstation 5")),
    target("Teenage Mutant Hero Turtles: Turtles in Time", "SNES"),
    target("Yoshi's Island / Super Mario World 2", "SNES"),
    target("Pokémon Black 2 ou White 2", "Nintendo DS", sourceNotes[0]),
    target("Pokémon Ultra Sun ou Ultra Moon", "Nintendo 3DS", sourceNotes[1]),
    target("Fire Emblem Fates (Birthright ou Conquest)", "Nintendo 3DS", sourceNotes[2]),
    target("Final Fantasy VIII", "Playstation"),
    ...Array.from({ length: 282 }, (_, i) => target("Unrelated-" + i, "Playstation")),
  ];
  wishlist[wishlist.length - 1].targetId = "UNIQUE-1";
  return {
    schemaVersion: 1,
    updatedAt: "2026-10-06T23:28:29.689Z",
    collection: [],
    wishlist,
    purchases: [],
    valuations: [],
    componentNeeds: [],
    history: [],
    collectionLists: [],
    nextObjective: {
      targetId: "NOVO", title: "Final Fantasy VIII",
      platform: "Playstation", setAt: "2026-10-08T08:00:00.000Z",
    },
  };
}

describe("production-only approved Wishlist cleanup guard", () => {
  it("does not expose authorization without the exact reviewed SHA-256", () => {
    const a = "a".repeat(64);
    expect(maintenanceSnapshotConfirmed(a, a)).toBe(true);
    expect(maintenanceSnapshotConfirmed(a, "")).toBe(false);
    expect(maintenanceSnapshotConfirmed(a, "b".repeat(64))).toBe(false);
  });

  it("handles 300 duplicated legacy NOVO IDs, preserves FFVIII and source notes, and produces exactly 291 targets", () => {
    const library = fixture();
    const original = structuredClone(library);
    const report = buildWishlistMaintenancePreflight(library, plan);
    expect(report.safeToApply).toBe(true);
    expect(report.sourceWishlistCount).toBe(301);
    expect(report.distinctTargetIdCount).toBe(2);
    expect(report.estimatedWishlistCount).toBe(291);

    const next = prepareApprovedWishlistCleanup(library, plan, nowIso);
    expect(next.wishlist).toHaveLength(291);
    expect(next.nextObjective).toEqual(original.nextObjective);
    expect(next.wishlist.filter((item) => item.platform === "Playstation 5")).toHaveLength(0);
    expect(next.wishlist.find((item) => item.title === "Warlocked")).toBeUndefined();
    expect(next.wishlist.filter((item) => item.title.startsWith("Unrelated-"))).toHaveLength(282);
    for (const title of ["Pokémon Black Version 2", "Pokémon White Version 2"]) {
      expect(next.wishlist.find((item) => item.title === title)?.notes).toBe(sourceNotes[0]);
    }
    for (const title of ["Pokémon Ultra Sun", "Pokémon Ultra Moon"]) {
      const notes = next.wishlist.find((item) => item.title === title)?.notes ?? "";
      expect(notes).toContain(sourceNotes[1]);
      expect(notes).toContain("Alternativa:");
    }
    for (const title of ["Fire Emblem Fates: Birthright", "Fire Emblem Fates: Conquest"]) {
      const notes = next.wishlist.find((item) => item.title === title)?.notes ?? "";
      expect(notes).toContain(sourceNotes[2]);
      expect(notes).toContain("Alternativa:");
    }
    expect(library).toEqual(original); // no mutation during preparation
  });

  it("blocks unexpected purchase state, stale notes, changed counts, or altered Next Objective", () => {
    const ordered = fixture();
    const item = ordered.wishlist.find((target) => target.title === "Warlocked")!;
    item.acquisition = { state: "ordered", purchaseId: "P-1", orderedAt: nowIso };
    expect(() => prepareApprovedWishlistCleanup(ordered, plan, nowIso)).toThrow();

    const notesChanged = fixture();
    notesChanged.wishlist.find((target) => target.title === "Pokémon Black 2 ou White 2")!.notes += " Nova preferência";
    expect(() => prepareApprovedWishlistCleanup(notesChanged, plan, nowIso)).toThrow();

    const wrongCount = fixture();
    wrongCount.wishlist.push(target("Another game", "NES"));
    expect(() => prepareApprovedWishlistCleanup(wrongCount, plan, nowIso)).toThrow();

    const objectiveChanged = fixture();
    objectiveChanged.nextObjective!.title = "Another game";
    expect(() => prepareApprovedWishlistCleanup(objectiveChanged, plan, nowIso)).toThrow();
  });

  it("is not repeatable against an already cleaned source snapshot", () => {
    const original = fixture();
    const cleaned = prepareApprovedWishlistCleanup(original, plan, nowIso);
    expect(() => prepareApprovedWishlistCleanup(cleaned, plan, nowIso)).toThrow();
  });
});
