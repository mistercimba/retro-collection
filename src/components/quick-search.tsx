"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { CollectionGame } from "@/lib/data/types";
import { displayPlatform } from "@/lib/data/platforms";
import { GameArtwork } from "@/components/artwork";
import { findQuickSearchMatches } from "@/lib/quick-search.logic";
import { buildCurrentPagePath, supportsListScrollRestoration } from "@/lib/list-url-state.logic";
import { saveListScrollPosition } from "@/hooks/use-list-scroll-restoration";

export function QuickSearch({ games, initialSearch = "" }: { games: CollectionGame[]; initialSearch?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = buildCurrentPagePath(pathname, searchParams.toString());
  const initialQuery = useMemo(() => new URLSearchParams(initialSearch).get("q") ?? "", [initialSearch]);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const allResults = useMemo(() => findQuickSearchMatches(games, query), [games, query]);
  const results = allResults.slice(0, 8);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, []);

  const showResults = open && query.trim().length >= 2;

  return <div ref={rootRef} className="relative z-50">
    <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-white shadow-sm focus-within:border-lime-200/60 focus-within:bg-white/15">
      <Search className="h-4 w-4 shrink-0 text-lime-200" />
      <input type="search" aria-label="Pesquisa rápida na coleção" value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder="Procurar jogo…" autoComplete="off" spellCheck={false} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/45 [&::-webkit-search-cancel-button]:hidden" />
      {query && <button type="button" onClick={() => { setQuery(""); setOpen(false); }} className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Limpar pesquisa"><X className="h-4 w-4" /></button>}
    </div>
    {showResults && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] max-h-[min(60vh,28rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white text-left shadow-2xl">
      {results.length ? results.map((game) => <Link key={game.collectionId} href={`/game/${encodeURIComponent(game.collectionId)}?from=${encodeURIComponent(returnTo)}`} className="grid grid-cols-[44px_1fr] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 hover:bg-slate-50" onClick={(event) => {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0 && supportsListScrollRestoration(returnTo)) saveListScrollPosition(returnTo);
        setOpen(false);
      }}>
        <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} className="h-14 w-11 rounded-lg" />
        <div className="min-w-0"><p className="truncate font-bold text-slate-950">{game.title}</p><p className="truncate text-xs text-slate-500">{displayPlatform(game.platform)} · {game.collectionId}</p></div>
      </Link>) : <p className="px-4 py-4 text-sm text-slate-500">Nada encontrado.</p>}
      {allResults.length > 8 && <Link href={`/search?q=${encodeURIComponent(query.trim())}`} className="block border-t border-slate-100 px-4 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50" onClick={() => setOpen(false)}>Ver todos ({allResults.length})</Link>}
    </div>}
  </div>;
}
