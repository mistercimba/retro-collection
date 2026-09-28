import Link from "next/link";
import { Gamepad2, Heart, LibraryBig, LogOut, ShoppingBag, Sparkles } from "lucide-react";
import { authEnabled } from "@/lib/auth";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-black tracking-tight text-slate-950">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white"><Gamepad2 className="h-5 w-5" /></span>
          <span className="hidden sm:inline">Mário&apos;s Retro Collection</span>
          <span className="sm:hidden">Retro Collection</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Link className="nav-link" href="/"><Sparkles className="h-4 w-4" />Início</Link>
          <Link className="nav-link" href="/collection"><LibraryBig className="h-4 w-4" />Coleção</Link>
          <Link className="nav-link" href="/want"><Heart className="h-4 w-4" />À procura</Link>
          <Link className="nav-link" href="/sell"><ShoppingBag className="h-4 w-4" />Para vender</Link>
        </nav>
        <div className="flex items-center gap-2">
          {authEnabled() && <form action="/logout" method="post"><button type="submit" className="icon-button" title="Terminar sessão" aria-label="Terminar sessão"><LogOut className="h-4 w-4" aria-hidden="true" /></button></form>}
        </div>
      </div>
    </header>
  );
}
