"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { CollectionGame } from "@/lib/data/types";
import { displayPlatform } from "@/lib/data/platforms";

export function QuickSearch({ games }: { games: CollectionGame[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-PT");
    if (q.length < 2) return [];
    return games.filter((game) => `${game.title} ${game.platform} ${game.collectionId}`.toLocaleLowerCase("pt-PT").includes(q)).slice(0, 8);
  }, [games, query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm ring-blue-600 focus-within:ring-2">
        <Search className="h-5 w-5 shrink-0 text-blue-700" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisa rápida: Silent Hill, Zelda, PS2..." className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-slate-400" />
        {query && <button onClick={() => setQuery("")} className="text-slate-400"><X className="h-4 w-4" /></button>}
      </div>
      {query.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {results.length ? results.map((game) => (
            <Link key={game.collectionId} href={`/game/${encodeURIComponent(game.collectionId)}`} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50" onClick={() => setQuery("")}>
              <div className="min-w-0"><p className="truncate font-semibold text-slate-950">{game.title}</p><p className="text-xs text-slate-500">{displayPlatform(game.platform)} · {game.collectionId}</p></div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${game.keepStatus === "Collection" ? "bg-emerald-50 text-emerald-800" : game.keepStatus === "Sell" ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-600"}`}>{game.keepStatus === "Collection" ? "✓ Na coleção" : game.keepStatus === "Sell" ? "€ Para venda" : "Vendido"}</span>
            </Link>
          )) : <p className="px-4 py-4 text-sm text-slate-500">Nada encontrado.</p>}
        </div>
      )}
    </div>
  );
}
