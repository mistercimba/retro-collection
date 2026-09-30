"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, History, Home, LibraryBig } from "lucide-react";

const links = [
  { href: "/", label: "Início", icon: Home },
  { href: "/collection", label: "Coleção", icon: LibraryBig },
  { href: "/want", label: "Wishlist", icon: Heart },
  { href: "/history", label: "Histórico", icon: History },
];

export function DesktopNav() {
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

  return <nav className="grid gap-1" aria-label="Navegação principal">
    {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={"side-nav-link" + (active(href) ? " side-nav-link-active" : "")}>
      <Icon className="h-5 w-5" /><span>{label}</span>
    </Link>)}
  </nav>;
}
