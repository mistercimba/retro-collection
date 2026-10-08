import { describe, expect, it } from "vitest";
import {
  analyzeWishlistMaintenance,
  hasConfirmedMaintenanceSnapshot,
  applyWishlistMaintenance,
  type WishlistMaintenanceLibrary,
  type WishlistMaintenancePlan,
  type WishlistMaintenanceTarget,
} from "../../scripts/wishlist-maintenance-logic.mjs";

const target = (overrides: Partial<WishlistMaintenanceTarget> = {}): WishlistMaintenanceTarget => ({
  platform: "SNES",
  priority: "Média",
  targetId: "T-1",
  title: "Example",
  reason: "Quero",
  targetVersion: "PAL; loose",
  priceCeilingEur: null,
  status: "ACTIVE",
  notes: "",
  ...overrides,
});

const library = (
  wishlist: WishlistMaintenanceTarget[],
  overrides: Partial<WishlistMaintenanceLibrary> = {},
): WishlistMaintenanceLibrary => ({
  schemaVersion: 1,
  updatedAt: "2026-10-01T00:00:00.000Z",
  collection: [],
  wishlist,
  purchases: [],
  valuations: [],
  componentNeeds: [],
  nextObjective: null,
  collectionLists: [],
  history: [],
  ...overrides,
});

describe("wishlist maintenance", () => {
  it("preserves approved real notes for each distinct version without making both obligatory", () => {
    const realNotes = "Escolher um; não é necessário comprar os dois.";
    const input = library([
      target({
        targetId: "NOVO", title: "Pokémon Ultra Sun ou Ultra Moon",
        platform: "Nintendo 3DS", notes: realNotes,
      }),
      target({ targetId: "NOVO", title: "Another 3DS Game", platform: "Nintendo 3DS" }),
    ]);
    const op = {
      type: "split" as const,
      match: { title: "Pokémon Ultra Sun ou Ultra Moon", platform: "Nintendo 3DS" },
      titles: ["Pokémon Ultra Sun", "Pokémon Ultra Moon"],
      expectedSourceNotes: realNotes,
      notesByTitle: {
        "Pokémon Ultra Sun": realNotes + " Alternativa: Pokémon Ultra Moon.",
        "Pokémon Ultra Moon": realNotes + " Alternativa: Pokémon Ultra Sun.",
      },
    };
    const plan: WishlistMaintenancePlan = { schemaVersion: 1, operations: [op] };
    const out = applyWishlistMaintenance(input, plan, { nowIso: "2026-10-08T11:00:00.000Z" });
    expect(out.report.safeToApply).toBe(true);
    expect(out.library.wishlist.map((x) => x.title)).toEqual([
      "Another 3DS Game", "Pokémon Ultra Sun", "Pokémon Ultra Moon",
    ]);
    expect(out.library.wishlist.slice(1).map((x) => x.notes)).toEqual([
      realNotes + " Alternativa: Pokémon Ultra Moon.",
      realNotes + " Alternativa: Pokémon Ultra Sun.",
    ]);
    expect(input.wishlist).toHaveLength(2);
    expect(input.wishlist[0].notes).toBe(realNotes);
  });

  it("blocks a stale notes plan and cannot silently drop a source note", () => {
    const source = target({
      targetId: "NOVO", title: "Pokémon Black 2 ou White 2",
      platform: "Nintendo DS", notes: "Confirmar código e autenticidade; não comprar repro.",
    });
    const plan: WishlistMaintenancePlan = {
      schemaVersion: 1,
      operations: [{
        type: "split",
        match: { title: source.title, platform: source.platform },
        titles: ["Pokémon Black Version 2", "Pokémon White Version 2"],
        expectedSourceNotes: source.notes,
        notesByTitle: {
          "Pokémon Black Version 2": source.notes,
          "Pokémon White Version 2": source.notes,
        },
      }],
    };
    expect(applyWishlistMaintenance(library([source]), plan).report.safeToApply).toBe(true);
    const changedSource = { ...source, notes: "Atenção: verificar também o estado da caixa" };
    expect(analyzeWishlistMaintenance(library([changedSource]), plan).blockers.map((x) => x.code)).toContain("notes");
    const missingDestinationNote: WishlistMaintenancePlan = structuredClone(plan);
    const missingOp = missingDestinationNote.operations[0];
    if (missingOp.type !== "split" || !missingOp.notesByTitle) throw new Error("Invalid test fixture");
    delete missingOp.notesByTitle["Pokémon White Version 2"];
    expect(analyzeWishlistMaintenance(library([source]), missingDestinationNote).blockers.map((x) => x.code)).toContain("notes");
    const droppedNote: WishlistMaintenancePlan = structuredClone(plan);
    const droppedOp = droppedNote.operations[0];
    if (droppedOp.type !== "split" || !droppedOp.notesByTitle) throw new Error("Invalid test fixture");
    droppedOp.notesByTitle["Pokémon Black Version 2"] = "";
    expect(analyzeWishlistMaintenance(library([source]), droppedNote).blockers.map((x) => x.code)).toContain("notes");
  });

  it("only removes the exact intended record when unrelated targets share the legacy NOVO ID", () => {
    const input = library([
      target({ targetId: "NOVO", title: "Warlocked", platform: "Game Boy Color" }),
      target({ targetId: "NOVO", title: "Another GBC Game", platform: "Game Boy Color" }),
      target({ targetId: "NOVO", title: "Pokémon Black 2 ou White 2", platform: "Nintendo DS" }),
    ], {
      nextObjective: {
        targetId: "NOVO", title: "Another GBC Game", platform: "Game Boy Color",
        setAt: "2026-10-08T10:00:00.000Z",
      },
    });
    const plan = { schemaVersion: 1, operations: [
      { type: "remove", match: { title: "Warlocked", platform: "Game Boy Color" } },
      { type: "split", match: { title: "Pokémon Black 2 ou White 2", platform: "Nintendo DS" },
        titles: ["Pokémon Black Version 2", "Pokémon White Version 2"] },
    ] } as WishlistMaintenancePlan;
    const result = applyWishlistMaintenance(input, plan, { nowIso: "2026-10-08T10:01:00.000Z" });
    expect(result.report.safeToApply).toBe(true);
    expect(result.library.wishlist.map((item) => item.title)).toEqual([
      "Another GBC Game", "Pokémon Black Version 2", "Pokémon White Version 2",
    ]);
    expect(result.library.nextObjective).toEqual(input.nextObjective);
    expect(result.library.wishlist).toHaveLength(3);
    expect(input.wishlist).toHaveLength(3);
  });

  it("blocks duplicate destination titles even when source and destination both have NOVO IDs", () => {
    const input = library([
      target({ targetId: "NOVO", title: "Pokémon Black 2 ou White 2", platform: "Nintendo DS" }),
      target({ targetId: "NOVO", title: "Pokémon Black Version 2", platform: "Nintendo DS" }),
    ]);
    const plan = { schemaVersion: 1, operations: [
      { type: "split", match: { title: "Pokémon Black 2 ou White 2", platform: "Nintendo DS" },
        titles: ["Pokémon Black Version 2", "Pokémon White Version 2"] },
    ] } as WishlistMaintenancePlan;
    const result = applyWishlistMaintenance(input, plan);
    expect(result.report.safeToApply).toBe(false);
    expect(result.report.blockers.map((item) => item.code)).toContain("destination-duplicate");
    expect(result.library).toEqual(input);
  });

  it("requires a reviewed fingerprint of the exact live Blob before an apply", () => {
    const fingerprint = "a".repeat(64);
    expect(hasConfirmedMaintenanceSnapshot(fingerprint, undefined)).toBe(false);
    expect(hasConfirmedMaintenanceSnapshot(fingerprint, "b".repeat(64))).toBe(false);
    expect(hasConfirmedMaintenanceSnapshot(fingerprint, "not-a-hash")).toBe(false);
    expect(hasConfirmedMaintenanceSnapshot(fingerprint, fingerprint)).toBe(true);
  });

  it("removes an exact target and every target on an approved platform", () => {
    const input = library([
      target({ targetId: "W", title: "Warlocked", platform: "Game Boy Color" }),
      target({ targetId: "P1", title: "Resident Evil 4", platform: "Playstation 5" }),
      target({
        targetId: "P2",
        title: "Stellar Blade",
        platform: "Playstation 5",
        artworkOverride: { pathname: "retro-collection/wishlist-artwork-overrides/P2/a.jpg" },
      }),
      target({ targetId: "KEEP", title: "Keep Me", platform: "SNES" }),
    ], {
      nextObjective: {
        targetId: "P1",
        title: "Resident Evil 4",
        platform: "Playstation 5",
        setAt: "2026-10-01T00:00:00.000Z",
      },
    });
    const plan: WishlistMaintenancePlan = {
      schemaVersion: 1,
      operations: [
        { type: "remove", match: { title: "Warlocked", platform: "Game Boy Color" } },
        { type: "remove-platform", platform: "Playstation 5" },
      ],
    };
    const result = applyWishlistMaintenance(input, plan, { nowIso: "2026-10-08T00:00:00.000Z" });
    expect(result.report.safeToApply).toBe(true);
    expect(result.library.wishlist.map((item) => item.targetId)).toEqual(["KEEP"]);
    expect(result.library.nextObjective).toBeNull();
    expect(result.cleanupArtworkPaths).toEqual([
      "retro-collection/wishlist-artwork-overrides/P2/a.jpg",
    ]);
  });

  it("renames an exact target and updates a matching Next Objective", () => {
    const input = library([
      target({
        targetId: "TMNT",
        title: "Teenage Mutant Hero Turtles: Turtles in Time",
        platform: "SNES",
      }),
    ], {
      nextObjective: {
        targetId: "TMNT",
        title: "Teenage Mutant Hero Turtles: Turtles in Time",
        platform: "SNES",
        setAt: "2026-10-01T00:00:00.000Z",
      },
    });
    const plan: WishlistMaintenancePlan = {
      schemaVersion: 1,
      operations: [{
        type: "rename",
        match: {
          title: "Teenage Mutant Hero Turtles: Turtles in Time",
          platform: "SNES",
        },
        title: "Teenage Mutant Hero Turtles IV: Turtles in Time",
      }],
    };
    const result = applyWishlistMaintenance(input, plan, { nowIso: "2026-10-08T00:00:00.000Z" });
    expect(result.report.safeToApply).toBe(true);
    expect(result.library.wishlist[0].title).toBe("Teenage Mutant Hero Turtles IV: Turtles in Time");
    expect(result.library.nextObjective?.title).toBe("Teenage Mutant Hero Turtles IV: Turtles in Time");
  });

  it("splits a clean combined target without duplicating unsafe metadata", () => {
    const input = library([
      target({
        targetId: "PKM",
        title: "Pokémon Black 2 ou White 2",
        platform: "Nintendo DS",
        priority: "Alta",
        reason: "Coleção",
        targetVersion: "PAL; CIB",
      }),
    ]);
    const plan: WishlistMaintenancePlan = {
      schemaVersion: 1,
      operations: [{
        type: "split",
        match: { title: "Pokémon Black 2 ou White 2", platform: "Nintendo DS" },
        titles: ["Pokémon Black Version 2", "Pokémon White Version 2"],
      }],
    };
    const result = applyWishlistMaintenance(input, plan, { nowIso: "2026-10-08T00:00:00.000Z" });
    expect(result.report.safeToApply).toBe(true);
    expect(result.library.wishlist.map((item) => item.title)).toEqual([
      "Pokémon Black Version 2",
      "Pokémon White Version 2",
    ]);
    for (const item of result.library.wishlist) {
      expect(item.priority).toBe("Alta");
      expect(item.reason).toBe("Coleção");
      expect(item.targetVersion).toBe("PAL; CIB");
      expect(item.priceCeilingEur).toBeNull();
      expect(item.notes).toBe("");
      expect(item.acquisition).toBeUndefined();
      expect(item.catalog).toBeUndefined();
      expect(item.artworkOverride).toBeUndefined();
    }
  });

  it("blocks a split when purchase state could be duplicated", () => {
    const input = library([
      target({
        targetId: "PKM",
        title: "Pokémon Black 2 ou White 2",
        platform: "Nintendo DS",
        acquisition: {
          state: "ordered",
          purchaseId: "PUR-1",
          orderedAt: "2026-10-01T00:00:00.000Z",
        },
      }),
    ]);
    const plan: WishlistMaintenancePlan = {
      schemaVersion: 1,
      operations: [{
        type: "split",
        match: { title: "Pokémon Black 2 ou White 2", platform: "Nintendo DS" },
        titles: ["Pokémon Black Version 2", "Pokémon White Version 2"],
      }],
    };
    const result = applyWishlistMaintenance(input, plan);
    expect(result.report.safeToApply).toBe(false);
    expect(result.report.blockers.map((item) => item.code)).toContain("ordered-target");
    expect(result.library).toEqual(input);
  });

  it("blocks ambiguous split metadata instead of guessing", () => {
    const input = library([
      target({
        targetId: "FE",
        title: "Fire Emblem Fates (Birthright ou Conquest)",
        platform: "Nintendo 3DS",
        priceCeilingEur: 40,
        notes: "Preferir a edição mais barata",
        catalog: { source: "IGDB" },
        artworkOverride: { pathname: "retro-collection/wishlist-artwork-overrides/FE/a.jpg" },
      }),
    ], {
      nextObjective: {
        targetId: "FE",
        title: "Fire Emblem Fates (Birthright ou Conquest)",
        platform: "Nintendo 3DS",
        setAt: "2026-10-01T00:00:00.000Z",
      },
    });
    const plan: WishlistMaintenancePlan = {
      schemaVersion: 1,
      operations: [{
        type: "split",
        match: {
          title: "Fire Emblem Fates (Birthright ou Conquest)",
          platform: "Nintendo 3DS",
        },
        titles: ["Fire Emblem Fates: Birthright", "Fire Emblem Fates: Conquest"],
      }],
    };
    const analysis = analyzeWishlistMaintenance(input, plan);
    expect(analysis.safeToApply).toBe(false);
    expect(analysis.blockers.map((item) => item.code)).toEqual(expect.arrayContaining([
      "next-objective",
      "manual-artwork-override",
      "canonical-catalog",
      "price-ceiling",
      "notes",
    ]));
  });

  it("blocks a bulk platform removal if any target is in transit", () => {
    const input = library([
      target({ targetId: "P1", title: "Game A", platform: "Playstation 5" }),
      target({
        targetId: "P2",
        title: "Game B",
        platform: "Playstation 5",
        acquisition: {
          state: "ordered",
          purchaseId: "PUR-2",
          orderedAt: "2026-10-01T00:00:00.000Z",
        },
      }),
    ]);
    const plan: WishlistMaintenancePlan = {
      schemaVersion: 1,
      operations: [{ type: "remove-platform", platform: "Playstation 5" }],
    };
    const result = applyWishlistMaintenance(input, plan);
    expect(result.report.safeToApply).toBe(false);
    expect(result.library).toEqual(input);
  });

  it("is idempotent when a split was already applied", () => {
    const input = library([
      target({ targetId: "B", title: "Pokémon Black Version 2", platform: "Nintendo DS" }),
      target({ targetId: "W", title: "Pokémon White Version 2", platform: "Nintendo DS" }),
    ]);
    const plan: WishlistMaintenancePlan = {
      schemaVersion: 1,
      operations: [{
        type: "split",
        match: { title: "Pokémon Black 2 ou White 2", platform: "Nintendo DS" },
        titles: ["Pokémon Black Version 2", "Pokémon White Version 2"],
      }],
    };
    const analysis = analyzeWishlistMaintenance(input, plan);
    expect(analysis.safeToApply).toBe(true);
    expect(analysis.operations[0].status).toBe("skipped");
  });
});
