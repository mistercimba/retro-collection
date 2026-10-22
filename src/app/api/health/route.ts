import { NextResponse } from "next/server";
import { getLibrary } from "@/lib/library-store";
import { classifyPlanState, matchWantTarget } from "@/lib/data/wishlist-matching";
import { isAuditCompleted } from "@/lib/data/collection-integrity";
import { isOrderedWishlistTarget } from "@/lib/wishlist-acquisition.logic";
import { GAME_ARTWORK } from "@/data/game-artwork";
import { resolveWishlistArtwork } from "@/lib/wishlist-artwork";
import { summarizeArtworkCoverage } from "@/lib/artwork-coverage.logic";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const library = await getLibrary();
    const kept = library.collection.filter((game) => game.keepStatus === "Collection");
    // Health reports coverage/counts, never market prices. Only active targets
    // need ownership matching; no fresh second Blob read after a successful read.
    const active = library.wishlist.filter((target) =>
      !isOrderedWishlistTarget(target) && classifyPlanState(target.status) !== "inactive"
      && matchWantTarget(target, kept).matchState !== "acquired",
    ).length;
    const collectionArtwork = summarizeArtworkCoverage(
      library.collection.map((game) => Boolean(GAME_ARTWORK[game.collectionId] || game.catalog?.artwork?.pathname)),
    );
    const wishlistArtwork = summarizeArtworkCoverage(
      library.wishlist.map((target) => Boolean(resolveWishlistArtwork(target))),
    );
    return NextResponse.json(
      {
        ok: true,
        provider: "library",
        storage: "blob",
        collection: {
          total: library.collection.length,
          kept: kept.length,
          sell: library.collection.filter((game) => game.keepStatus === "Sell").length,
          sold: library.collection.filter((game) => game.keepStatus === "Sold").length,
          review: kept.filter((game) => game.needsReview).length,
          auditRecords: library.collection.filter((game) => isAuditCompleted(game.audit?.auditStatus)).length,
          platforms: new Set(kept.map((game) => game.platform)).size,
        },
        wishlist: {
          total: library.wishlist.length,
          active,
          ordered: library.wishlist.filter(isOrderedWishlistTarget).length,
        },
        artwork: {
          collection: collectionArtwork,
          wishlist: wishlistArtwork,
        },
        purchases: library.purchases.length,
        updatedAt: library.updatedAt,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    console.error("Health check failed", { code: "COLLECTION_DATA_UNAVAILABLE" });
    return NextResponse.json(
      {
        ok: false,
        provider: "library",
        error: "Collection data could not be loaded.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
