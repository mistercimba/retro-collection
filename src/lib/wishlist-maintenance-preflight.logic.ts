import { analyzeWishlistMaintenance } from "../../scripts/wishlist-maintenance-logic.mjs";
import type {
  WishlistMaintenanceLibrary,
  WishlistMaintenancePlan,
} from "../../scripts/wishlist-maintenance-logic.mjs";

export function buildWishlistMaintenancePreflight(
  library: WishlistMaintenanceLibrary,
  plan: WishlistMaintenancePlan,
) {
  const analysis = analyzeWishlistMaintenance(library, plan);
  const counts = new Map<string, number>();
  for (const target of library.wishlist) {
    counts.set(target.targetId, (counts.get(target.targetId) ?? 0) + 1);
  }
  const collidingTargetIds = [...counts]
    .filter(([, count]) => count > 1)
    .map(([targetId, count]) => ({ targetId, count }))
    .sort((a, b) => b.count - a.count || a.targetId.localeCompare(b.targetId));
  const operations = plan.operations.map((operation, index) => {
    const status = analysis.operations[index];
    const existing = operation.type === "remove-platform"
      ? library.wishlist.filter((target) => target.platform === operation.platform)
      : library.wishlist.filter((target) =>
          target.platform === operation.match.platform && target.title === operation.match.title
        );

    return {
      index: index + 1,
      type: operation.type,
      status: status.status,
      count: status.count,
      note: status.note,
      platform: operation.type === "remove-platform" ? operation.platform : operation.match.platform,
      existing: existing.map((target) => ({
        targetId: target.targetId,
        title: target.title,
        platform: target.platform,
        ...(operation.type === "split" ? { notes: target.notes || "" } : {}),
      })),
      proposedTitles: operation.type === "rename"
        ? [operation.title]
        : operation.type === "split" ? operation.titles : [],
    };
  });

  const delta = analysis.operations.reduce((sum, result) => {
    if (result.status !== "planned") return sum;
    if (result.type === "remove" || result.type === "remove-platform") return sum - result.count;
    if (result.type === "split") return sum + result.count - 1;
    return sum;
  }, 0);

  return {
    planId: analysis.planId,
    sourceUpdatedAt: library.updatedAt,
    sourceWishlistCount: analysis.sourceWishlistCount,
    distinctTargetIdCount: counts.size,
    collidingTargetIds: collidingTargetIds.slice(0, 20),
    nextObjective: library.nextObjective
      ? { targetId: library.nextObjective.targetId,
          title: library.nextObjective.title,
          platform: library.nextObjective.platform }
      : null,
    estimatedWishlistCount: analysis.safeToApply ? analysis.sourceWishlistCount + delta : null,
    safeToApply: analysis.safeToApply,
    operations,
    blockers: analysis.blockers,
  };
}
