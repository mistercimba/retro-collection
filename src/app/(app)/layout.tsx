import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { OfflineSnapshotSync } from "@/components/offline-snapshot-sync";
import { requireAuth } from "@/lib/auth";
import { performance } from "node:perf_hooks";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authStarted = performance.now();
  try {
    await requireAuth();
  } catch (error) {
    const digest = error && typeof error === "object" && "digest" in error ? String(error.digest) : "";
    if (!digest.startsWith("NEXT_REDIRECT;")) {
      console.error("app_layout_auth_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    }
    throw error;
  }
  const authDuration = Math.round((performance.now() - authStarted) * 10) / 10;
  return <div className="min-h-screen bg-slate-50"><meta name="server-auth-timing" content={`require_auth;dur=${authDuration}`} /><Header /><OfflineSnapshotSync /><main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">{children}</main><MobileNav /></div>;
}
