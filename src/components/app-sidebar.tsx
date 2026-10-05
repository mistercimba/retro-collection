import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import type { QuickSearchableGame, QuickSearchableWishlistItem } from "@/lib/quick-search.logic";
import { QuickSearch } from "@/components/quick-search";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { DesktopNav } from "@/components/desktop-nav";
import { LogoutButton } from "@/components/logout-button";
import { authEnabled } from "@/lib/auth";

export function AppSidebar({
  games,
  wishlist,
  platforms,
}: {
  games: QuickSearchableGame[];
  wishlist: QuickSearchableWishlistItem[];
  platforms: string[];
}) {
  return <aside className="hidden min-h-screen w-[17rem] shrink-0 flex-col border-r border-white/10 bg-[#152c25] px-4 py-5 text-white md:sticky md:top-0 md:flex md:h-screen">
    <Link href="/" className="flex items-center gap-3 px-1">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d9f36a] text-[#152c25]"><Gamepad2 className="h-5 w-5" /></span>
      <span><strong className="block text-sm font-black tracking-tight">Mário&apos;s Retro</strong><span className="text-[11px] font-semibold text-white/45">Collection</span></span>
    </Link>
    <div className="mt-6"><QuickSearch games={games} wishlist={wishlist} /></div>
    <div className="mt-5"><DesktopNav /></div>
    <div className="mt-3 border-t border-white/10 pt-3"><QuickAddDialog platforms={platforms} trigger="sidebar" /></div>
    <div className="mt-auto border-t border-white/10 pt-4 text-xs text-white/45">
      <p>A tua coleção. Sem tralha.</p>
      {authEnabled() && <div className="mt-3"><LogoutButton /></div>}
    </div>
  </aside>;
}
