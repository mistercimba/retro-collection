import { describe, expect, it } from "vitest";
import { getCatalogLibraryState } from "./catalog-library-state.logic";
import type { CollectionGame, WantTarget } from "./data/types";

const game = (title: string, platform: string, keepStatus: string): Pick<CollectionGame, "title" | "platform" | "keepStatus"> => ({
  title,
  platform,
  keepStatus,
});

const target = (title: string, platform: string, status = "ACTIVE"): WantTarget => ({
  platform,
  priority: "Média",
  targetId: `${platform}-${title}`,
  title,
  reason: "",
  targetVersion: "",
  priceCeilingEur: null,
  status,
  notes: "",
});

describe("catalog library state", () => {
  it("marks current physical copies as owned but ignores sold history", () => {
    const state = getCatalogLibraryState([
      game("Pokémon Stadium", "Nintendo 64", "Collection"),
      game("Pokemon Stadium", "N64", "Sell"),
      game("Pokemon Stadium", "Nintendo 64", "Sold"),
    ], [], "Pokemon Stadium", "Nintendo 64");

    expect(state.ownedCount).toBe(2);
    expect(state.badges).toContain("owned");
  });

  it("marks active wishlist targets and ignores inactive history", () => {
    const state = getCatalogLibraryState([], [
      target("Silent Hill 2", "Playstation 2"),
      target("Silent Hill 2", "Playstation 2", "COMPRADO"),
    ], "Silent Hill 2", "Playstation 2");

    expect(state.wishlistCount).toBe(1);
    expect(state.badges).toEqual(["wishlist"]);
  });

  it("marks an ordered copy separately from an active wishlist target", () => {
    const ordered = {
      ...target("Silent Hill 2", "Playstation 2"),
      acquisition: { state: "ordered" as const, purchaseId: "APP-1", orderedAt: "2026-10-06T20:00:00.000Z" },
    };
    const state = getCatalogLibraryState([], [ordered], "Silent Hill 2", "Playstation 2");
    expect(state.orderedCount).toBe(1);
    expect(state.wishlistCount).toBe(0);
    expect(state.badges).toEqual(["ordered"]);
  });

  it("can expose owned and wishlist at the same time without blocking another copy", () => {
    const state = getCatalogLibraryState(
      [game("Trauma Center: Under the Knife", "Nintendo DS", "Collection")],
      [target("Trauma Center: Under the Knife", "Nintendo DS")],
      "Trauma Center: Under the Knife",
      "Nintendo DS",
    );

    expect(state.badges).toEqual(["owned", "wishlist"]);
  });
});
