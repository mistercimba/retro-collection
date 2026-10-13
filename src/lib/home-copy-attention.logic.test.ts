import { describe, expect, it } from "vitest";
import type { CollectionGame } from "./data/types";
import type { ComponentNeedEntry } from "./component-needs.logic";
import { buildHomeCopyAttention } from "./home-copy-attention.logic";

type CopyOverview = Pick<CollectionGame, "collectionId" | "title" | "platform" | "keepStatus" | "needsReview">;
function copy(collectionId: string, title: string, overrides: Partial<CopyOverview> = {}): CopyOverview {
  return { collectionId, title, platform: "Playstation", keepStatus: "Collection", needsReview: false, ...overrides };
}
function need(collectionId: string, label: string, status: ComponentNeedEntry["status"] = "missing"): ComponentNeedEntry {
  return {
    id: "N-" + collectionId + "-" + label, collectionId, componentKey: "custom",
    label, status, notes: "", createdAt: "", updatedAt: "", completedAt: "",
    title: "", platform: "Playstation", edition: "", inferred: false,
  };
}

describe("home copy-level attention queue", () => {
  it("groups several missing parts into one actionable physical copy", () => {
    const result = buildHomeCopyAttention(
      [copy("PS2-1", "Silent Hill 2"), copy("PS2-2", "Ico")],
      [need("PS2-1", "Manual"), need("PS2-1", "Caixa"), need("PS2-1", "Manual"), need("PS2-2", "Manual")],
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ collectionId: "PS2-2", kind: "missing" });
    expect(result[1]).toMatchObject({ collectionId: "PS2-1", kind: "missing", summary: "Em falta: Manual, Caixa" });
  });

  it("includes copies needing review without falsely claiming a part is missing", () => {
    const result = buildHomeCopyAttention([copy("C-1", "Game", { needsReview: true })], []);
    expect(result).toEqual([{
      collectionId: "C-1", title: "Game", platform: "Playstation",
      kind: "review", summary: "Confirmar estado e componentes desta cópia",
    }]);
  });

  it("puts missing first, review second and tracking last; excludes sold and unneeded copies", () => {
    const games = [
      copy("C-4", "Tracking"),
      copy("C-3", "Review", { needsReview: true }),
      copy("C-2", "Missing"),
      copy("C-1", "Sold", { keepStatus: "Sold", needsReview: true }),
      copy("C-0", "Complete"),
    ];
    const queue = [
      need("C-4", "Manual", "found"), need("C-2", "Caixa"),
      need("C-1", "Manual"), need("C-0", "Ignored", "received"),
    ];
    expect(buildHomeCopyAttention(games, queue).map((item) => [item.collectionId, item.kind])).toEqual([
      ["C-2", "missing"], ["C-3", "review"], ["C-4", "tracking"],
    ]);
  });

  it("keeps multiple physical copies separate even when their titles match", () => {
    const result = buildHomeCopyAttention(
      [copy("A", "Final Fantasy VIII"), copy("B", "Final Fantasy VIII")],
      [need("B", "Manual"), need("A", "Caixa")],
    );
    expect(result.map((item) => item.collectionId)).toEqual(["A", "B"]);
  });
});
