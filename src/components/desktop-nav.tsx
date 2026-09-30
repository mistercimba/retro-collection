"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, History, Home, LibraryBig } from "lucide-react";
import { getActiveAppNavigation } from "@/lib/app-navigation.logic";

const links = [
  { href: "/", label: "Início", icon: Home },
  { href: "/collection", label: "Coleção", icon: LibraryBig },
  { href: "/want", label: "Wishlist", icon: Heart },
  { href: "/history", label: "Histórico", icon: History },
];

export function DesktopNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeHref = getActiveAppNavigation(pathname, searchParams.get("tab"));

  return <nav className="grid gap-1" aria-label="Navegação principal">
    {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={activeHref === href ? "page" : undefined} className={"side-nav-link" + (activeHref === href ? " side-nav-link-active" : "")}>
      <Icon className="h-5 w-5" /><span>{label}</span>
    </Link>)}
  </nav>;
}
