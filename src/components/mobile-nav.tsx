"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, Home, LibraryBig } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wishlistPlatform = pathname.startsWith("/platform/") && searchParams.get("tab") === "wishlist";
  const active = (href: string) => href === "/"
    ? pathname === "/"
    : href === "/collection"
      ? pathname.startsWith("/collection") || (pathname.startsWith("/platform/") && !wishlistPlatform) || pathname.startsWith("/game/")
      : pathname.startsWith("/want") || pathname.startsWith("/wish/") || wishlistPlatform;
  const cls = (href: string) => "mobile-nav-link" + (active(href) ? " mobile-nav-link-active" : "");

  return <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
    <div className="mx-auto grid max-w-md grid-cols-3">
      <Link href="/" className={cls("/")} aria-current={active("/") ? "page" : undefined}><Home className="h-5 w-5" /><span>Início</span></Link>
      <Link href="/collection" className={cls("/collection")} aria-current={active("/collection") ? "page" : undefined}><LibraryBig className="h-5 w-5" /><span>Coleção</span></Link>
      <Link href="/want" className={cls("/want")} aria-current={active("/want") ? "page" : undefined}><Heart className="h-5 w-5" /><span>Wishlist</span></Link>
    </div>
  </nav>;
}
