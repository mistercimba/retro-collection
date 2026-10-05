"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, History, Home, LibraryBig, ListChecks } from "lucide-react";
import { getActiveAppNavigation } from "@/lib/app-navigation.logic";
import { QuickAddDialog } from "@/components/quick-add-dialog";

export function MobileNav({ platforms }: { platforms: string[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeHref = getActiveAppNavigation(pathname, searchParams.get("tab"));
  const active = (href: string) => activeHref === href;
  const cls = (href: string) => "mobile-nav-link" + (active(href) ? " mobile-nav-link-active" : "");

  return <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
    <div className="mx-auto grid max-w-xl grid-cols-6">
      <Link href="/" className={cls("/")} aria-current={active("/") ? "page" : undefined}><Home className="h-5 w-5" /><span>Início</span></Link>
      <Link href="/collection" className={cls("/collection")} aria-current={active("/collection") ? "page" : undefined}><LibraryBig className="h-5 w-5" /><span>Coleção</span></Link>
      <QuickAddDialog platforms={platforms} trigger="mobile" />
      <Link href="/want" className={cls("/want")} aria-current={active("/want") ? "page" : undefined}><Heart className="h-5 w-5" /><span>Wishlist</span></Link>
      <Link href="/lists" className={cls("/lists")} aria-current={active("/lists") ? "page" : undefined}><ListChecks className="h-5 w-5" /><span>Listas</span></Link>
      <Link href="/history" className={cls("/history")} aria-current={active("/history") ? "page" : undefined}><History className="h-5 w-5" /><span>Histórico</span></Link>
    </div>
  </nav>;
}