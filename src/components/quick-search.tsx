"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CollectionGame } from "@/lib/data/types";
import { displayPlatform } from "@/lib/data/platforms";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function QuickSearch({ games }: { games: CollectionGame[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = normalizeSearch(query);
    if (q.length < 2) return [];
    const tokens = q.split(/\s+/).filter(Boolean);

    return games
      .filter((game) => {
        const haystack = normalizeSearch(
          [game.title, game.platform, displayPlatform(game.platform), game.collectionId, game.edition, game.region, game.overallStatus].join(" "),
        );
        return tokens.every((token) => haystack.includes(token));
      })
      .slice(0, 10);
  }, [games, query]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const showResults = open && query.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative z-50">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm ring-blue-600 focus-within:ring-2">
        <Search className="h-5 w-5 shrink-0 text-blue-700" />
        <input
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          placeholder="Pesquisa rápida: Silent Hill, Zelda, PS2..."
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Limpar pesquisa"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-[60] max-h-[min(60vh,30rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white text-left shadow-2xl">
          {results.length ? (
            results.map((game) => (
              <Link
                key={game.collectionId}
                href={`/game/${encodeURIComponent(game.collectionId)}`}
                className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 hover:bg-slate-50"
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                }}
              >
                <div className="h-14 overflow-hidden rounded-lg bg-slate-100">
                  <img
                    src={`/api/artwork/game?title=${encodeURIComponent(game.title)}&platform=${encodeURIComponent(game.platform)}`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-contain p-1"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">{game.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {displayPlatform(game.platform)} · {game.collectionId}
                    {game.edition ? ` · ${game.edition}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                    game.keepStatus === "Collection"
                      ? "bg-emerald-50 text-emerald-800"
                      : game.keepStatus === "Sell"
                        ? "bg-rose-50 text-rose-800"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {game.keepStatus === "Collection" ? "✓ Na coleção" : game.keepStatus === "Sell" ? "€ Para venda" : "Vendido"}
                </span>
              </Link>
            ))
          ) : (
            <p className="px-4 py-4 text-sm text-slate-500">Nada encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
