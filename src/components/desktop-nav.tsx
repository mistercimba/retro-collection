"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LibraryBig } from "lucide-react";

const links = [
  { href: "/", label: "Início", icon: Home },
  { href: "/collection", label: "Coleção", icon: LibraryBig },
  { href: "/want", label: "Wishlist", icon: Heart },
];

export function DesktopNav() {
  const pathname = usePathname();
  const active = (href: string) => href === "/"
    ? pathname === "/"
    : href === "/collection"
      ? pathname.startsWith("/collection") || pathname.startsWith("/platform/") || pathname.startsWith("/game/")
      : pathname.startsWith("/want") || pathname.startsWith("/wish/");

  return <nav className="grid gap-1" aria-label="Navegação principal">
    {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={"side-nav-link" + (active(href) ? " side-nav-link-active" : "")}>
      <Icon className="h-5 w-5" /><span>{label}</span>
    </Link>)}
  </nav>;
}
