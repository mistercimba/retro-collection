import Link from "next/link";
import { Home, LibraryBig, ShoppingBag } from "lucide-react";

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3">
        <Link href="/" className="mobile-nav-link"><Home className="h-5 w-5" /><span>Início</span></Link>
        <Link href="/collection" className="mobile-nav-link"><LibraryBig className="h-5 w-5" /><span>Coleção</span></Link>
        <Link href="/sell" className="mobile-nav-link"><ShoppingBag className="h-5 w-5" /><span>Venda</span></Link>
      </div>
    </nav>
  );
}
