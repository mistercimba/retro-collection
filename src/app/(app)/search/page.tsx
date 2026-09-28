import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { GameArtwork } from "@/components/artwork";
import { getAllGames } from "@/lib/data/collection-service";
import { displayPlatform } from "@/lib/data/platforms";
import { findQuickSearchMatches } from "@/lib/quick-search.logic";

export const metadata = { title: "Resultados da pesquisa" };

export default async function SearchResultsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [games, params] = await Promise.all([getAllGames(), searchParams]);
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const results = findQuickSearchMatches(games, query);
  const returnTo = `/search?q=${encodeURIComponent(query)}`;

  return <div className="space-y-4 pb-6">
    <Link href="/collection/games" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-800"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Todos os jogos</Link>
    <header>
      <p className="section-kicker">PESQUISA GLOBAL</p>
      <h1 className="section-title">Resultados para “{query || "…"}”</h1>
      <p className="mt-1 text-sm text-slate-600">{query ? `${results.length} resultado${results.length === 1 ? "" : "s"}` : "Escreve pelo menos dois caracteres na pesquisa."}</p>
    </header>
    {results.length ? <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {results.map((game) => <li key={game.collectionId}>
        <Link href={`/game/${encodeURIComponent(game.collectionId)}?from=${encodeURIComponent(returnTo)}`} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-800">
          <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} className="h-14 w-11 rounded-lg" />
          <span className="min-w-0"><span className="block truncate font-semibold text-slate-950">{game.title}</span><span className="block truncate text-xs text-slate-500">{displayPlatform(game.platform)} · {game.collectionId}{game.edition ? ` · ${game.edition}` : ""}{game.region ? ` · ${game.region}` : ""}</span></span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{game.keepStatus === "Collection" ? "Na coleção" : game.keepStatus === "Sell" ? "Para vender" : game.keepStatus === "Sold" ? "Vendidos" : game.keepStatus}</span>
        </Link>
      </li>)}
    </ul> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Search className="mx-auto h-5 w-5 text-slate-400" aria-hidden="true" /><p className="mt-2 font-bold text-slate-900">Sem resultados</p><p className="mt-1 text-sm text-slate-500">Experimenta outro título, plataforma ou Collection ID.</p><Link href="/collection/games" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white">Explorar coleção</Link></div>}
  </div>;
}
