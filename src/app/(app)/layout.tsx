import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { AppSidebar } from "@/components/app-sidebar";
import { OfflineSnapshotSync } from "@/components/offline-snapshot-sync";
import { requireAuth } from "@/lib/auth";
import { getAllGames } from "@/lib/data/collection-service";
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
  const games = await getAllGames();
  const authDuration = Math.round((performance.now() - authStarted) * 10) / 10;

  return <div className="min-h-screen bg-[#f3efe6] md:flex">
    <meta name="server-auth-timing" content={`require_auth;dur=${authDuration}`} />
    <AppSidebar games={games} />
    <div className="min-w-0 flex-1">
      <Header />
      <OfflineSnapshotSync />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 md:pb-10 md:pt-7">{children}</main>
    </div>
    <MobileNav />
  </div>;
}
