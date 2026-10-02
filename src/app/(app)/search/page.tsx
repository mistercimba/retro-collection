import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { GameArtwork } from "@/components/artwork";
import { WishlistArtwork } from "@/components/wishlist-artwork";
import { getAllGames, getWantlist } from "@/lib/data/collection-service";
import { displayPlatform } from "@/lib/data/platforms";
import { findQuickSearchMatches, findQuickSearchWishlistMatches } from "@/lib/quick-search.logic";
import { resolveWishlistArtwork } from "@/lib/wishlist-artwork";
import type { CollectionGame } from "@/lib/data/types";

export const metadata = { title: "Resultados da pesquisa" };

function collectionLabel(game: CollectionGame) {
  if (game.keepStatus === "Collection") return "Coleção";
  if (game.keepStatus === "Sell") return "Para vender";
  if (game.keepStatus === "Sold") return "Vendido";
  return game.keepStatus || "Coleção";
}

export default async function SearchResultsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [games, wantlist, params] = await Promise.all([getAllGames(), getWantlist(), searchParams]);
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const activeWishlist = wantlist
    .filter((target) => target.planState !== "inactive" && target.matchState !== "acquired")
    .map((target) => ({ ...target, artworkSrc: resolveWishlistArtwork(target) }));
  const collectionResults = findQuickSearchMatches(games, query).map((game) => ({ kind: "collection" as const, title: game.title, game }));
  const wishlistResults = findQuickSearchWishlistMatches(activeWishlist, query).map((target) => ({ kind: "wishlist" as const, title: target.title, target }));
  const results = [...collectionResults, ...wishlistResults].sort((a, b) =>
    a.title.localeCompare(b.title, "pt-PT") ||
    (a.kind === b.kind ? 0 : a.kind === "collection" ? -1 : 1),
  );
  const returnTo = `/search?q=${encodeURIComponent(query)}`;

  return <div className="space-y-4 pb-6">
    <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-800"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Início</Link>
    <header>
      <p className="section-kicker">PESQUISA GLOBAL</p>
      <h1 className="section-title">Resultados para “{query || "…"}”</h1>
      <p className="mt-1 text-sm text-slate-600">{query ? `${results.length} resultado${results.length === 1 ? "" : "s"} na coleção e wishlist` : "Escreve pelo menos dois caracteres na pesquisa."}</p>
    </header>

    {results.length ? <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {results.map((result) => {
        if (result.kind === "collection") {
          const game = result.game;
          return <li key={`collection:${game.collectionId}`}>
            <Link href={`/game/${encodeURIComponent(game.collectionId)}?from=${encodeURIComponent(returnTo)}`} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-800">
              <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} className="h-14 w-11 rounded-lg" />
              <span className="min-w-0"><span className="block truncate font-semibold text-slate-950">{game.title}</span><span className="block truncate text-xs text-slate-500">{displayPlatform(game.platform)} · {game.collectionId}{game.edition ? ` · ${game.edition}` : ""}{game.region ? ` · ${game.region}` : ""}</span></span>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-900">{collectionLabel(game)}</span>
            </Link>
          </li>;
        }

        const target = result.target;
        const wishParams = new URLSearchParams({ platform: target.platform, title: target.title, from: returnTo });
        return <li key={`wishlist:${target.targetId}:${target.platform}:${target.title}`}>
          <Link href={`/wish/${encodeURIComponent(target.targetId)}?${wishParams.toString()}`} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 hover:bg-rose-50/60 focus-visible:outline-2 focus-visible:outline-rose-700">
            <WishlistArtwork title={target.title} platform={target.platform} artworkSrc={target.artworkSrc} className="h-14 w-11 rounded-lg" />
            <span className="min-w-0"><span className="block truncate font-semibold text-slate-950">{target.title}</span><span className="block truncate text-xs text-slate-500">{displayPlatform(target.platform)}{target.targetVersion ? ` · ${target.targetVersion}` : ""}{target.priority ? ` · ${target.priority}` : ""}</span></span>
            <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-bold text-rose-800">Wishlist</span>
          </Link>
        </li>;
      })}
    </ul> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Search className="mx-auto h-5 w-5 text-slate-400" aria-hidden="true" /><p className="mt-2 font-bold text-slate-900">Sem resultados</p><p className="mt-1 text-sm text-slate-500">Experimenta outro título, plataforma, Collection ID ou versão da wishlist.</p><Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white">Voltar ao início</Link></div>}
  </div>;
}
