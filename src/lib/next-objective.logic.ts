import type { NextCollectionObjective, WantListEntry, WantTarget } from "./data/types";
import { isOrderedWishlistTarget } from "./wishlist-acquisition.logic";

export function objectiveMatchesTarget(
  objective: NextCollectionObjective | null | undefined,
  target: Pick<WantTarget, "targetId" | "title" | "platform">,
): boolean {
  return Boolean(
    objective &&
    objective.targetId === target.targetId &&
    objective.title === target.title &&
    objective.platform === target.platform
  );
}

export function resolveNextObjective(
  objective: NextCollectionObjective | null | undefined,
  targets: WantListEntry[],
): WantListEntry | null {
  if (!objective) return null;
  const target = targets.find((item) => objectiveMatchesTarget(objective, item));
  if (!target) return null;
  if (isOrderedWishlistTarget(target)) return null;
  if (target.planState !== "active" || target.matchState === "acquired") return null;
  return target;
}
