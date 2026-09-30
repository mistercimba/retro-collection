"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, History, Home, LibraryBig } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wishlistPlatform = pathname.startsWith("/platform/") && searchParams.get("tab") === "wishlist";
  const active = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/collection") return pathname.startsWith("/collection") || (pathname.startsWith("/platform/") && !wishlistPlatform) || pathname.startsWith("/game/");
    if (href === "/want") return pathname.startsWith("/want") || pathname.startsWith("/wish/") || wishlistPlatform;
    if (href === "/history") return pathname.startsWith("/history");
    return false;
  };
  const cls = (href: string) => "mobile-nav-link" + (active(href) ? " mobile-nav-link-active" : "");

  return <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
    <div className="mx-auto grid max-w-lg grid-cols-4">
      <Link href="/" className={cls("/")} aria-current={active("/") ? "page" : undefined}><Home className="h-5 w-5" /><span>Início</span></Link>
      <Link href="/collection" className={cls("/collection")} aria-current={active("/collection") ? "page" : undefined}><LibraryBig className="h-5 w-5" /><span>Coleção</span></Link>
      <Link href="/want" className={cls("/want")} aria-current={active("/want") ? "page" : undefined}><Heart className="h-5 w-5" /><span>Wishlist</span></Link>
      <Link href="/history" className={cls("/history")} aria-current={active("/history") ? "page" : undefined}><History className="h-5 w-5" /><span>Histórico</span></Link>
    </div>
  </nav>;
}
