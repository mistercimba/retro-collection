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

export type WishlistMaintenanceTarget = {
  platform: string;
  priority: string;
  targetId: string;
  title: string;
  reason: string;
  targetVersion: string;
  priceCeilingEur: number | null;
  status: string;
  notes: string;
  acquisition?: { state: string; purchaseId?: string; orderedAt?: string } | null;
  catalog?: unknown;
  artworkOverride?: { pathname?: string } | null;
  [key: string]: unknown;
};

export type WishlistMaintenanceLibrary = {
  schemaVersion: 1;
  updatedAt: string;
  collection: Array<{
    title: string;
    platform: string;
    keepStatus?: string;
    [key: string]: unknown;
  }>;
  wishlist: WishlistMaintenanceTarget[];
  purchases: Array<Record<string, unknown>>;
  valuations: Array<Record<string, unknown>>;
  componentNeeds?: Array<Record<string, unknown>>;
  nextObjective?: {
    targetId: string;
    title: string;
    platform: string;
    setAt: string;
  } | null;
  collectionLists?: Array<Record<string, unknown>>;
  history?: Array<Record<string, unknown>>;
  [key: string]: unknown;
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
  operations: Array<{
    operationIndex: number;
    type: string;
    status: string;
    count: number;
    note: string;
  }>;
  blockers: WishlistMaintenanceBlocker[];
};

export function analyzeWishlistMaintenance(
  library: WishlistMaintenanceLibrary,
  plan: WishlistMaintenancePlan,
): WishlistMaintenanceReport;

export function applyWishlistMaintenance(
  library: WishlistMaintenanceLibrary,
  plan: WishlistMaintenancePlan,
  options?: { nowIso?: string },
): {
  library: WishlistMaintenanceLibrary;
  cleanupArtworkPaths: string[];
  report: WishlistMaintenanceReport;
};
