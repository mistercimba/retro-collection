import type { LibraryData } from "@/lib/data/types";

/**
 * Explicit allowlist for a portable collection/wishlist audit.
 * Never serialize the original library or spread whole private records:
 * purchases, costs, seller data, photo paths, history and valuations stay out.
 */
export function buildCollectionWishlistExport(library: LibraryData, exportedAt: string) {
  return {
    schemaVersion: 1 as const,
    exportedAt,
    sourceUpdatedAt: library.updatedAt,
    collection: library.collection.map((game) => ({
      collectionId: game.collectionId,
      title: game.title,
      platform: game.platform,
      edition: game.edition,
      region: game.region,
      keepStatus: game.keepStatus,
      media: game.media,
      box: game.box,
      manual: game.manual,
      audit: game.audit ? {
        localizedTitle: game.audit.localizedTitle,
        productCode: game.audit.productCode,
        region: game.audit.region,
        releaseMarket: game.audit.releaseMarket,
      } : null,
    })),
    wishlist: library.wishlist.map((target) => ({
      targetId: target.targetId,
      title: target.title,
      platform: target.platform,
      priority: target.priority,
      targetVersion: target.targetVersion,
      status: target.status,
      reason: target.reason,
      notes: target.notes,
      acquisitionState: target.acquisition?.state ?? null,
    })),
  };
}
