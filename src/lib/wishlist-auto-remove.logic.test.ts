import { describe, expect, it } from "vitest";
import { wishlistTargetsSatisfiedByAddedGame } from "./wishlist-auto-remove.logic";
import type { WantTarget } from "@/lib/data/types";

const target = (title: string, platform: string, id: string): WantTarget => ({
  title,
  platform,
  targetId: id,
  priority: "Média",
  reason: "",
  targetVersion: "",
  priceCeilingEur: null,
  status: "ACTIVE",
  notes: "",
});

describe("wishlistTargetsSatisfiedByAddedGame", () => {
  it("matches only the same normalized title on the same platform", () => {
    const wishlist = [
      target("Pokémon Stadium", "Nintendo 64", "1"),
      target("Pokemon Stadium", "Nintendo DS", "2"),
      target("Pokémon Stadium 2", "Nintendo 64", "3"),
    ];

    expect(wishlistTargetsSatisfiedByAddedGame(wishlist, "Pokemon Stadium", "Nintendo 64").map((x) => x.targetId)).toEqual(["1"]);
  });

  it("can remove duplicate exact targets if legacy data contains them", () => {
    const wishlist = [
      target("Silent Hill 2", "Playstation 2", "1"),
      target("Silent Hill 2", "Playstation 2", "2"),
    ];

    expect(wishlistTargetsSatisfiedByAddedGame(wishlist, "Silent Hill 2", "Playstation 2")).toHaveLength(2);
  });
});
