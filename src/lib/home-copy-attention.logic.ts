import type { CollectionGame } from "./data/types";
import type { ComponentNeedEntry } from "./component-needs.logic";

type CopyOverview = Pick<CollectionGame, "collectionId" | "title" | "platform" | "keepStatus" | "needsReview">;

export type HomeCopyAttention = {
  collectionId: string;
  title: string;
  platform: string;
  kind: "missing" | "review" | "tracking";
  summary: string;
};

const priority = { missing: 0, review: 1, tracking: 2 } as const;

export function buildHomeCopyAttention(
  games: readonly CopyOverview[],
  activeNeeds: readonly ComponentNeedEntry[],
): HomeCopyAttention[] {
  const byCopy = new Map<string, ComponentNeedEntry[]>();
  for (const need of activeNeeds) {
    if (!["missing", "found", "purchased"].includes(need.status)) continue;
    const current = byCopy.get(need.collectionId) ?? [];
    current.push(need);
    byCopy.set(need.collectionId, current);
  }

  const items: HomeCopyAttention[] = [];
  for (const game of games) {
    if (game.keepStatus !== "Collection") continue;
    const needs = byCopy.get(game.collectionId) ?? [];
    const missing = [...new Set(needs.filter((need) => need.status === "missing").map((need) => need.label.trim()).filter(Boolean))];
    const tracking = [...new Set(needs.filter((need) => need.status !== "missing").map((need) => need.label.trim()).filter(Boolean))];
    if (missing.length > 0) {
      items.push({ collectionId: game.collectionId, title: game.title, platform: game.platform,
        kind: "missing", summary: "Em falta: " + missing.join(", ") });
    } else if (game.needsReview) {
      items.push({ collectionId: game.collectionId, title: game.title, platform: game.platform,
        kind: "review", summary: "Confirmar estado e componentes desta cópia" });
    } else if (tracking.length > 0) {
      items.push({ collectionId: game.collectionId, title: game.title, platform: game.platform,
        kind: "tracking", summary: "Em acompanhamento: " + tracking.join(", ") });
    }
  }

  return items.sort((a, b) =>
    priority[a.kind] - priority[b.kind] ||
    a.platform.localeCompare(b.platform, "pt-PT") ||
    a.title.localeCompare(b.title, "pt-PT") ||
    a.collectionId.localeCompare(b.collectionId, "pt-PT")
  );
}
