import type { WishlistMaintenanceLibrary, WishlistMaintenancePlan } from "../../scripts/wishlist-maintenance-logic.mjs";

export function buildWishlistPostCleanupAudit(
  library: WishlistMaintenanceLibrary,
  plan: WishlistMaintenancePlan,
) {
  // This reports values ACTUALLY persisted in the live library, not the plan's
  // proposedNotes. It is read-only and only exposes the six approved targets.
  const history = library.history ?? [];
  const splitOperations = plan.operations.filter((op) => op.type === "split");
  const entries = splitOperations.flatMap((op) =>
    op.titles.map((title) => {
      const exact = library.wishlist.filter((target) =>
        target.title === title && target.platform === op.match.platform
      );
      const actual = exact.length === 1 ? exact[0] : null;
      return {
        title,
        platform: op.match.platform,
        matches: exact.length,
        targetId: actual?.targetId ?? null,
        persistedNotesMatch: actual !== null &&
          actual.notes === op.notesByTitle?.[title],
        historyAddFound: actual !== null && history.some((event) =>
          event.action === "wishlist.add" && event.title === title &&
          event.platform === op.match.platform && event.entityId === actual.targetId
        ),
      };
    })
  );
  const removedCombinedHistory = splitOperations.map((op) => ({
    title: op.match.title,
    platform: op.match.platform,
    historyRemoveFound: history.some((event) =>
      event.action === "wishlist.remove" && event.title === op.match.title &&
      event.platform === op.match.platform
    ),
  }));
  const historyRecorded = entries.every((entry) => entry.historyAddFound) &&
    removedCombinedHistory.every((entry) => entry.historyRemoveFound);

  return {
    liveWishlistCount: library.wishlist.length,
    sourceUpdatedAt: library.updatedAt,
    splitEntries: entries,
    removedCombinedHistory,
    verifiedNotesCount: entries.filter((entry) => entry.persistedNotesMatch).length,
    verifiedNewTargetHistoryCount: entries.filter((entry) => entry.historyAddFound).length,
    historyRecorded,
    notesVerified: entries.length === 6 && entries.every((entry) =>
      entry.matches === 1 && entry.persistedNotesMatch
    ),
  };
}
