"use client";

import Link from "next/link";
import { PackageOpen, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { displayPlatform } from "@/lib/data/platforms";
import { GameArtwork } from "@/components/artwork";
import { WishlistArtwork } from "@/components/wishlist-artwork";
import {
  findQuickSearchMatches,
  findQuickSearchWishlistMatches,
  type QuickSearchableGame,
  type QuickSearchableWishlistItem,
} from "@/lib/quick-search.logic";
import { buildCurrentPagePath, supportsListScrollRestoration } from "@/lib/list-url-state.logic";
import { saveListScrollPosition } from "@/hooks/use-list-scroll-restoration";

function collectionLabel(game: QuickSearchableGame) {
  if (game.keepStatus === "Collection") return "Coleção";
  if (game.keepStatus === "Sell") return "Para vender";
  if (game.keepStatus === "Sold") return "Vendido";
  return game.keepStatus || "Coleção";
}

export function QuickSearch({
  games,
  wishlist = [],
  initialSearch = "",
}: {
  games: QuickSearchableGame[];
  wishlist?: QuickSearchableWishlistItem[];
  initialSearch?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchOrigin, setSearchOrigin] = useState<string | null>(null);
  const returnTo = searchOrigin ?? buildCurrentPagePath(pathname, searchParams.toString());
  const initialQuery = useMemo(() => new URLSearchParams(initialSearch).get("q") ?? "", [initialSearch]);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const collectionResults = useMemo(
    () => findQuickSearchMatches(games, query).sort((a, b) => a.title.localeCompare(b.title, "pt-PT")),
    [games, query],
  );
  const wishlistResults = useMemo(
    () => findQuickSearchWishlistMatches(wishlist, query).sort((a, b) => a.title.localeCompare(b.title, "pt-PT")),
    [wishlist, query],
  );
  const visibleCollection = collectionResults.slice(0, 5);
  const visibleWishlist = wishlistResults.slice(0, 5);
  const totalResults = collectionResults.length + wishlistResults.length;

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, []);

  const showResults = open && query.trim().length >= 2;
  const openSearch = () => {
    setSearchOrigin(buildCurrentPagePath(window.location.pathname, window.location.search));
    setOpen(true);
  };
  const onResultClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0 && supportsListScrollRestoration(returnTo)) {
      saveListScrollPosition(returnTo);
    }
    setOpen(false);
  };

  return <div ref={rootRef} className="relative z-50">
    <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-white shadow-sm focus-within:border-lime-200/60 focus-within:bg-white/15">
      <Search className="h-4 w-4 shrink-0 text-lime-200" />
      <input
        type="search"
        aria-label="Pesquisa rápida na coleção e wishlist"
        value={query}
        onFocus={openSearch}
        onChange={(event) => { setQuery(event.target.value); openSearch(); }}
        placeholder="Coleção ou wishlist…"
        autoComplete="off"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/45 [&::-webkit-search-cancel-button]:hidden"
      />
      {query && <button type="button" onClick={() => { setQuery(""); setOpen(false); }} className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Limpar pesquisa"><X className="h-4 w-4" /></button>}
    </div>

    {showResults && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] max-h-[min(65vh,32rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white text-left shadow-2xl">
      {totalResults > 0 ? <>
        {collectionResults.length > 0 && <section aria-label="Resultados da coleção">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Coleção</span>
            <span className="text-[10px] font-bold text-slate-400">{collectionResults.length}</span>
          </div>
          {visibleCollection.map((game) => <Link key={`collection:${game.collectionId}`} href={`/game/${encodeURIComponent(game.collectionId)}?from=${encodeURIComponent(returnTo)}`} className="grid grid-cols-[44px_1fr] items-center gap-3 border-b border-slate-100 px-3 py-2.5 hover:bg-slate-50" onClick={onResultClick}>
            <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} catalogArtwork={game.catalogArtwork} className="h-14 w-11 rounded-lg" />
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-1.5 font-bold text-slate-950">
                <span className="truncate">{game.title}</span>
                {game.needsCompletion && <span title="Tem peças em falta" aria-label="Tem peças em falta" className="shrink-0 text-amber-600"><PackageOpen className="h-3.5 w-3.5" /></span>}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-900">{collectionLabel(game)}</span>
                <span className="truncate">{displayPlatform(game.platform)} · {game.collectionId}</span>
              </div>
            </div>
          </Link>)}
        </section>}

        {wishlistResults.length > 0 && <section aria-label="Resultados da wishlist">
          <div className="flex items-center justify-between border-b border-slate-100 bg-rose-50/70 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-700">Wishlist</span>
            <span className="text-[10px] font-bold text-rose-400">{wishlistResults.length}</span>
          </div>
          {visibleWishlist.map((target) => {
            const params = new URLSearchParams({
              platform: target.platform,
              title: target.title,
              from: returnTo,
            });
            return <Link key={`wishlist:${target.targetId}:${target.platform}:${target.title}`} href={`/wish/${encodeURIComponent(target.targetId)}?${params.toString()}`} className="grid grid-cols-[44px_1fr] items-center gap-3 border-b border-slate-100 px-3 py-2.5 hover:bg-rose-50/60" onClick={onResultClick}>
              <WishlistArtwork title={target.title} platform={target.platform} artworkSrc={target.artworkSrc} className="h-14 w-11 rounded-lg" />
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-950">{target.title}</p>
                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                  <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-800">Wishlist</span>
                  <span className="truncate">{displayPlatform(target.platform)}{target.targetVersion ? ` · ${target.targetVersion}` : ""}</span>
                </div>
              </div>
            </Link>;
          })}
        </section>}
      </> : <p className="px-4 py-4 text-sm text-slate-500">Nada encontrado na coleção nem na wishlist.</p>}
      {(collectionResults.length > visibleCollection.length || wishlistResults.length > visibleWishlist.length) && <Link href={`/search?q=${encodeURIComponent(query.trim())}`} className="block border-t border-slate-100 px-4 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50" onClick={() => setOpen(false)}>Ver todos ({totalResults})</Link>}
    </div>}
  </div>;
}
