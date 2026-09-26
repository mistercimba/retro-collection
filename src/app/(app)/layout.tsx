import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { requireAuth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <div className="min-h-screen bg-slate-50"><Header /><main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">{children}</main><MobileNav /></div>;
}
