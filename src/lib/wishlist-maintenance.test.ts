import { describe, expect, it } from "vitest";
import { analyzeWishlistMaintenance, applyWishlistMaintenance } from "../../scripts/wishlist-maintenance-logic.mjs";

const target = (overrides: Record<string, unknown> = {}) => ({
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

const library = (wishlist: any[], overrides: Record<string, unknown> = {}) => ({
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
  it("removes an exact target and every target on an approved platform", () => {
    const input = library([
      target({ targetId: "W", title: "Warlocked", platform: "Game Boy Color" }),
      target({ targetId: "P1", title: "Resident Evil 4", platform: "Playstation 5" }),
      target({ targetId: "P2", title: "Stellar Blade", platform: "Playstation 5", artworkOverride: { pathname: "retro-collection/wishlist-artwork-overrides/P2/a.jpg" } }),
      target({ targetId: "KEEP", title: "Keep Me", platform: "SNES" }),
    ], {
      nextObjective: { targetId: "P1", title: "Resident Evil 4", platform: "Playstation 5", setAt: "2026-10-01T00:00:00.000Z" },
    });
    const plan = {
      schemaVersion: 1,
      operations: [
        { type: "remove", match: { title: "Warlocked", platform: "Game Boy Color" } },
        { type: "remove-platform", platform: "Playstation 5" },
      ],
    };
    const result = applyWishlistMaintenance(input, plan, { nowIso: "2026-10-08T00:00:00.000Z" });
    expect(result.report.safeToApply).toBe(true);
    expect(result.library.wishlist.map((item: any) => item.targetId)).toEqual(["KEEP"]);
    expect(result.library.nextObjective).toBeNull();
    expect(result.cleanupArtworkPaths).toEqual(["retro-collection/wishlist-artwork-overrides/P2/a.jpg"]);
  });

  it("renames an exact target and updates a matching Next Objective", () => {
    const input = library([
      target({ targetId: "TMNT", title: "Teenage Mutant Hero Turtles: Turtles in Time", platform: "SNES" }),
    ], {
      nextObjective: { targetId: "TMNT", title: "Teenage Mutant Hero Turtles: Turtles in Time", platform: "SNES", setAt: "2026-10-01T00:00:00.000Z" },
    });
    const plan = {
      schemaVersion: 1,
      operations: [{
        type: "rename",
        match: { title: "Teenage Mutant Hero Turtles: Turtles in Time", platform: "SNES" },
        title: "Teenage Mutant Hero Turtles IV: Turtles in Time",
      }],
    };
    const result = applyWishlistMaintenance(input, plan, { nowIso: "2026-10-08T00:00:00.000Z" });
    expect(result.report.safeToApply).toBe(true);
    expect(result.library.wishlist[0].title).toBe("Teenage Mutant Hero Turtles IV: Turtles in Time");
    expect(result.library.nextObjective.title).toBe("Teenage Mutant Hero Turtles IV: Turtles in Time");
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
    const plan = {
      schemaVersion: 1,
      operations: [{
        type: "split",
        match: { title: "Pokémon Black 2 ou White 2", platform: "Nintendo DS" },
        titles: ["Pokémon Black Version 2", "Pokémon White Version 2"],
      }],
    };
    const result = applyWishlistMaintenance(input, plan, { nowIso: "2026-10-08T00:00:00.000Z" });
    expect(result.report.safeToApply).toBe(true);
    expect(result.library.wishlist.map((item: any) => item.title)).toEqual([
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
        acquisition: { state: "ordered", purchaseId: "PUR-1", orderedAt: "2026-10-01T00:00:00.000Z" },
      }),
    ]);
    const plan = {
      schemaVersion: 1,
      operations: [{
        type: "split",
        match: { title: "Pokémon Black 2 ou White 2", platform: "Nintendo DS" },
        titles: ["Pokémon Black Version 2", "Pokémon White Version 2"],
      }],
    };
    const result = applyWishlistMaintenance(input, plan);
    expect(result.report.safeToApply).toBe(false);
    expect(result.report.blockers.map((item: any) => item.code)).toContain("ordered-target");
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
      nextObjective: { targetId: "FE", title: "Fire Emblem Fates (Birthright ou Conquest)", platform: "Nintendo 3DS", setAt: "2026-10-01T00:00:00.000Z" },
    });
    const plan = {
      schemaVersion: 1,
      operations: [{
        type: "split",
        match: { title: "Fire Emblem Fates (Birthright ou Conquest)", platform: "Nintendo 3DS" },
        titles: ["Fire Emblem Fates: Birthright", "Fire Emblem Fates: Conquest"],
      }],
    };
    const analysis = analyzeWishlistMaintenance(input, plan);
    expect(analysis.safeToApply).toBe(false);
    expect(analysis.blockers.map((item: any) => item.code)).toEqual(expect.arrayContaining([
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
      target({ targetId: "P2", title: "Game B", platform: "Playstation 5", acquisition: { state: "ordered", purchaseId: "PUR-2", orderedAt: "2026-10-01T00:00:00.000Z" } }),
    ]);
    const plan = { schemaVersion: 1, operations: [{ type: "remove-platform", platform: "Playstation 5" }] };
    const result = applyWishlistMaintenance(input, plan);
    expect(result.report.safeToApply).toBe(false);
    expect(result.library).toEqual(input);
  });

  it("is idempotent when a split was already applied", () => {
    const input = library([
      target({ targetId: "B", title: "Pokémon Black Version 2", platform: "Nintendo DS" }),
      target({ targetId: "W", title: "Pokémon White Version 2", platform: "Nintendo DS" }),
    ]);
    const plan = {
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
