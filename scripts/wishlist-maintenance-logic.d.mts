export type WishlistMaintenanceMatch = { title: string; platform: string };
export type WishlistMaintenanceOperation =
  | { type: "remove"; match: WishlistMaintenanceMatch }
  | { type: "remove-platform"; platform: string }
  | { type: "rename"; match: WishlistMaintenanceMatch; title: string }
  | { type: "split"; match: WishlistMaintenanceMatch; titles: string[] };
export type WishlistMaintenancePlan = {
  schemaVersion: 1;
  id?: string;
  description?: string;
  operations: WishlistMaintenanceOperation[];
};
export type WishlistMaintenanceBlocker = {
  operationIndex: number;
  code: string;
  message: string;
  targetId: string;
  title: string;
  platform: string;
};
export type WishlistMaintenanceReport = {
  planId: string;
  safeToApply: boolean;
  sourceWishlistCount: number;
  finalWishlistCount?: number;
  applied?: boolean;
  operations: Array<{ operationIndex: number; type: string; status: string; count: number; note: string }>;
  blockers: WishlistMaintenanceBlocker[];
};
export function analyzeWishlistMaintenance(library: any, plan: WishlistMaintenancePlan): WishlistMaintenanceReport;
export function applyWishlistMaintenance(
  library: any,
  plan: WishlistMaintenancePlan,
  options?: { nowIso?: string },
): { library: any; cleanupArtworkPaths: string[]; report: WishlistMaintenanceReport };
