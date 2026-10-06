import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { AppSidebar } from "@/components/app-sidebar";
import { OfflineSnapshotSync } from "@/components/offline-snapshot-sync";
import { requireAuth } from "@/lib/auth";
import { getAllGames, getComponentCompletionQueue, getWantlist } from "@/lib/data/collection-service";
import { sortPlatformsByRelease } from "@/lib/data/platforms";
import { toQuickSearchableGame } from "@/lib/quick-search.logic";
import { resolveWishlistArtwork } from "@/lib/wishlist-artwork";
import { performance } from "node:perf_hooks";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authStarted = performance.now();
  try {
    await requireAuth();
  } catch (error) {
    const digest = error && typeof error === "object" && "digest" in error ? String(error.digest) : "";
    if (!digest.startsWith("NEXT_REDIRECT;")) console.error("app_layout_auth_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    throw error;
  }
  const [games, wantlist, completion] = await Promise.all([getAllGames(), getWantlist(), getComponentCompletionQueue()]);
  const incompleteIds = new Set(completion.active.map((need) => need.collectionId));
  const searchGames = games.map((game) => toQuickSearchableGame(game, incompleteIds.has(game.collectionId)));
  const activeWishlist = wantlist
    .filter((target) => target.planState !== "inactive" && target.matchState !== "acquired")
    .map((target) => ({
      title: target.title,
      platform: target.platform,
      targetId: target.targetId,
      targetVersion: target.targetVersion,
      priority: target.priority,
      artworkSrc: resolveWishlistArtwork(target),
    }));
  const platforms = sortPlatformsByRelease(
    [...new Set([...games.map((game) => game.platform), ...activeWishlist.map((target) => target.platform)])]
      .map((platform) => ({ platform })),
  ).map((item) => item.platform);
  const authDuration = Math.round((performance.now() - authStarted) * 10) / 10;

  return <div className="min-h-screen bg-[#f3efe6] md:flex">
    <meta name="server-auth-timing" content={`require_auth;dur=${authDuration}`} />
    <AppSidebar games={searchGames} wishlist={activeWishlist} platforms={platforms} />
    <div className="min-w-0 flex-1">
      <Header />
      <OfflineSnapshotSync />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 md:pb-10 md:pt-7">{children}</main>
    </div>
    <MobileNav platforms={platforms} />
  </div>;
}
