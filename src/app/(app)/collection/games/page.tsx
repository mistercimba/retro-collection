import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CollectionBrowser } from "@/components/collection-browser";
import { getCollectionListGames } from "@/lib/game-list-data";
import { searchParamsToString } from "@/lib/list-url-state.logic";

export const metadata = { title: "Todos os jogos" };

export default async function AllGamesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [games, query] = await Promise.all([getCollectionListGames(), searchParams]);
  return <div><Link href="/collection" className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-800"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Biblioteca de plataformas</Link><header className="mb-4"><p className="section-kicker">BIBLIOTECA COMPLETA</p><h1 className="section-title">Todos os jogos</h1><p className="mt-1 text-sm text-slate-600">{games.length} cópias na coleção. Género e valores são lidos dos snapshots disponíveis.</p></header><CollectionBrowser games={games} global initialSearch={searchParamsToString(query)} /></div>;
}
