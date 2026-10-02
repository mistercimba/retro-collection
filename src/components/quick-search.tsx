"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { CollectionGame } from "@/lib/data/types";
import { displayPlatform } from "@/lib/data/platforms";
import { GameArtwork } from "@/components/artwork";
import { WishlistArtwork } from "@/components/wishlist-artwork";
import {
  findQuickSearchMatches,
  findQuickSearchWishlistMatches,
  type QuickSearchableWishlistItem,
} from "@/lib/quick-search.logic";
import { buildCurrentPagePath, supportsListScrollRestoration } from "@/lib/list-url-state.logic";
import { saveListScrollPosition } from "@/hooks/use-list-scroll-restoration";

function collectionLabel(game: CollectionGame) {
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
  games: CollectionGame[];
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

  const allResults = useMemo(() => {
    const collectionResults = findQuickSearchMatches(games, query).map((game) => ({
      kind: "collection" as const,
      title: game.title,
      game,
    }));
    const wishlistResults = findQuickSearchWishlistMatches(wishlist, query).map((target) => ({
      kind: "wishlist" as const,
      title: target.title,
      target,
    }));
    return [...collectionResults, ...wishlistResults].sort((a, b) =>
      a.title.localeCompare(b.title, "pt-PT") ||
      (a.kind === b.kind ? 0 : a.kind === "collection" ? -1 : 1),
    );
  }, [games, wishlist, query]);
  const results = allResults.slice(0, 8);

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

    {showResults && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] max-h-[min(60vh,28rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white text-left shadow-2xl">
      {results.length ? results.map((result) => {
        if (result.kind === "collection") {
          const game = result.game;
          return <Link key={`collection:${game.collectionId}`} href={`/game/${encodeURIComponent(game.collectionId)}?from=${encodeURIComponent(returnTo)}`} className="grid grid-cols-[44px_1fr] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 hover:bg-slate-50" onClick={onResultClick}>
            <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} className="h-14 w-11 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950">{game.title}</p>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-900">{collectionLabel(game)}</span>
                <span className="truncate">{displayPlatform(game.platform)} · {game.collectionId}</span>
              </div>
            </div>
          </Link>;
        }

        const target = result.target;
        const params = new URLSearchParams({
          platform: target.platform,
          title: target.title,
          from: returnTo,
        });
        return <Link key={`wishlist:${target.targetId}:${target.platform}:${target.title}`} href={`/wish/${encodeURIComponent(target.targetId)}?${params.toString()}`} className="grid grid-cols-[44px_1fr] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 hover:bg-rose-50/60" onClick={onResultClick}>
          <WishlistArtwork title={target.title} platform={target.platform} artworkSrc={target.artworkSrc} className="h-14 w-11 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-950">{target.title}</p>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
              <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-800">Wishlist</span>
              <span className="truncate">{displayPlatform(target.platform)}{target.targetVersion ? ` · ${target.targetVersion}` : ""}</span>
            </div>
          </div>
        </Link>;
      }) : <p className="px-4 py-4 text-sm text-slate-500">Nada encontrado na coleção nem na wishlist.</p>}
      {allResults.length > 8 && <Link href={`/search?q=${encodeURIComponent(query.trim())}`} className="block border-t border-slate-100 px-4 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50" onClick={() => setOpen(false)}>Ver todos ({allResults.length})</Link>}
    </div>}
  </div>;
}
