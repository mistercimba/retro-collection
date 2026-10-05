import { collectionCopyIdentity } from "@/lib/copy-groups.logic";
import type { CollectionGame, CollectionList, CollectionListTarget } from "@/lib/data/types";

export interface ResolvedCollectionListTarget extends CollectionListTarget {
  ownedGame: CollectionGame | null;
}

export interface ResolvedCollectionList {
  list: CollectionList;
  targets: ResolvedCollectionListTarget[];
  ownedCount: number;
  totalCount: number;
}

export function collectionListTargetIdentity(target: Pick<CollectionListTarget, "title" | "platform">): string {
  return collectionCopyIdentity({ title: target.title, platform: target.platform });
}

export function resolveCollectionList(list: CollectionList, games: readonly CollectionGame[]): ResolvedCollectionList {
  const ownedByIdentity = new Map<string, CollectionGame>();
  for (const game of games) {
    if (game.keepStatus !== "Collection") continue;
    const key = collectionCopyIdentity(game);
    if (!ownedByIdentity.has(key)) ownedByIdentity.set(key, game);
  }

  const targets = list.targets.map((target) => ({
    ...target,
    ownedGame: ownedByIdentity.get(collectionListTargetIdentity(target)) ?? null,
  }));
  return { list, targets, ownedCount: targets.filter((target) => target.ownedGame !== null).length, totalCount: targets.length };
}

export function collectionListProgressPercent(ownedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((ownedCount / totalCount) * 100)));
}

export function hasCollectionListTarget(list: Pick<CollectionList, "targets">, target: Pick<CollectionListTarget, "title" | "platform">): boolean {
  const identity = collectionListTargetIdentity(target);
  return list.targets.some((item) => collectionListTargetIdentity(item) === identity);
}
