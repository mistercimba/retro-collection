import { applyWishlistMaintenance, hasConfirmedMaintenanceSnapshot } from "../../scripts/wishlist-maintenance-logic.mjs";
import type {
  WishlistMaintenanceLibrary,
  WishlistMaintenancePlan,
} from "../../scripts/wishlist-maintenance-logic.mjs";
import { buildWishlistMaintenancePreflight } from "./wishlist-maintenance-preflight.logic";

type PreflightReport = ReturnType<typeof buildWishlistMaintenancePreflight>;
const expectedCounts = [1, 12, 1, 1, 2, 2, 2];

export function isExpectedWishlistCleanupPreflight(report: PreflightReport): boolean {
  return report.safeToApply &&
    report.sourceWishlistCount === 301 &&
    report.estimatedWishlistCount === 291 &&
    report.operations.length === expectedCounts.length &&
    report.operations.every((item, index) =>
      item.index === index + 1 && item.status === "planned" &&
      item.count === expectedCounts[index]
    ) &&
    report.nextObjective?.targetId === "NOVO" &&
    report.nextObjective.title === "Final Fantasy VIII" &&
    report.nextObjective.platform === "Playstation" &&
    report.blockers.length === 0;
}

export function prepareApprovedWishlistCleanup(
  library: WishlistMaintenanceLibrary,
  plan: WishlistMaintenancePlan,
  nowIso: string,
): WishlistMaintenanceLibrary {
  const preflight = buildWishlistMaintenancePreflight(library, plan);
  if (!isExpectedWishlistCleanupPreflight(preflight)) {
    throw new Error("O estado atual da Wishlist não corresponde ao plano aprovado.");
  }
  const result = applyWishlistMaintenance(library, plan, { nowIso });
  if (!result.report.safeToApply || result.library.wishlist.length !== 291) {
    throw new Error("A operação não corresponde às alterações aprovadas.");
  }
  // An exact-identity Next Objective must be untouched even though 300 of the
  // old Wishlist records share the legacy targetId "NOVO".
  if (JSON.stringify(result.library.nextObjective) !== JSON.stringify(library.nextObjective)) {
    throw new Error("A limpeza alteraria o Próximo objetivo.");
  }
  for (const key of ["collection", "purchases", "valuations", "componentNeeds", "collectionLists"] as const) {
    if (JSON.stringify(result.library[key]) !== JSON.stringify(library[key])) {
      throw new Error("A limpeza alteraria dados fora da Wishlist: " + key);
    }
  }
  return result.library;
}

export const maintenanceSnapshotConfirmed = hasConfirmedMaintenanceSnapshot;
