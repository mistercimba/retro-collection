"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LibraryBig, ShoppingBag, Sparkles } from "lucide-react";

const links = [
  { href: "/", label: "Início", icon: Sparkles },
  { href: "/collection", label: "Coleção", icon: LibraryBig },
  { href: "/want", label: "À procura", icon: Heart },
  { href: "/sell", label: "Para vender", icon: ShoppingBag },
];

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/"
          ? pathname === "/"
          : href === "/collection"
            ? pathname === href || pathname.startsWith("/collection/") || pathname.startsWith("/platform/") || pathname.startsWith("/game/")
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} className={`nav-link${active ? " nav-link-active" : ""}`} href={href} aria-current={active ? "page" : undefined}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </Link>
        );
      })}
    </nav>
  );
}
