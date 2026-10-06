import { NextResponse } from "next/server";
import { dataMode, getStats, getWantlist } from "@/lib/data/collection-service";
import { getLibrary, getLibraryStorageMode } from "@/lib/library-store";
import { isOrderedWishlistTarget } from "@/lib/wishlist-acquisition.logic";
import { GAME_ARTWORK } from "@/data/game-artwork";
import { resolveWishlistArtwork } from "@/lib/wishlist-artwork";
import { summarizeArtworkCoverage } from "@/lib/artwork-coverage.logic";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [stats, targets, library] = await Promise.all([getStats(), getWantlist(), getLibrary()]);
    const storage = await getLibraryStorageMode();
    const collectionArtwork = summarizeArtworkCoverage(
      library.collection.map((game) => Boolean(GAME_ARTWORK[game.collectionId] || game.catalog?.artwork?.pathname)),
    );
    const wishlistArtwork = summarizeArtworkCoverage(
      library.wishlist.map((target) => Boolean(resolveWishlistArtwork(target))),
    );
    return NextResponse.json(
      {
        ok: true,
        provider: dataMode(),
        storage,
        collection: {
          total: library.collection.length,
          kept: stats.kept,
          sell: stats.sell,
          sold: stats.sold,
          review: stats.review,
          auditRecords: stats.auditRecords,
          platforms: stats.platforms.length,
        },
        wishlist: {
          total: library.wishlist.length,
          active: targets.filter((target) => !isOrderedWishlistTarget(target) && target.planState !== "inactive" && target.matchState !== "acquired").length,
          ordered: targets.filter(isOrderedWishlistTarget).length,
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
        provider: dataMode(),
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
