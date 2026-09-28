"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LibraryBig, ShoppingBag } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/"
    ? pathname === "/"
    : href === "/collection"
      ? pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith("/platform/") || pathname.startsWith("/game/")
      : pathname === href || pathname.startsWith(`${href}/`);
  const navLink = (href: string) => `mobile-nav-link${isActive(href) ? " mobile-nav-link-active" : ""}`;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        <Link href="/" className={navLink("/")} aria-current={isActive("/") ? "page" : undefined}><Home className="h-5 w-5" /><span>Início</span></Link>
        <Link href="/collection" className={navLink("/collection")} aria-current={isActive("/collection") ? "page" : undefined}><LibraryBig className="h-5 w-5" /><span>Coleção</span></Link>
        <Link href="/want" className={navLink("/want")} aria-current={isActive("/want") ? "page" : undefined}><Heart className="h-5 w-5" /><span>À procura</span></Link>
        <Link href="/sell" className={navLink("/sell")} aria-current={isActive("/sell") ? "page" : undefined}><ShoppingBag className="h-5 w-5" /><span>Venda</span></Link>
      </div>
    </nav>
  );
}
