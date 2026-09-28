import Link from "next/link";
import { ArrowRight, ArrowUpRight, LibraryBig } from "lucide-react";
import { PlatformArtwork } from "@/components/artwork";
import { QuickSearch } from "@/components/quick-search";
import { getCollectionListGames, collectionValue } from "@/lib/game-list-data";
import { displayPlatform, platformSlug } from "@/lib/data/platforms";
import { isAuditCompleted } from "@/lib/data/collection-integrity";
import { formatEuro } from "@/lib/format";
import { searchParamsToString } from "@/lib/list-url-state.logic";
import { collectServerPerf, measureServerWork, toServerTimingHeader } from "@/lib/server-perf";

export const metadata = { title: "Coleção" };

export default async function CollectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const measured = await collectServerPerf(() => Promise.all([
    measureServerWork("collection.list_loader", getCollectionListGames),
    measureServerWork("collection.search_params", () => searchParams),
  ]));
  const [games, query] = measured.value;
  const platforms = [...new Set(games.map((game) => game.platform))].map((platform) => {
    const items = games.filter((game) => game.platform === platform);
    const audited = items.filter((game) => isAuditCompleted(game.audit?.auditStatus)).length;
    return { platform, slug: platformSlug(platform), items, audited, value: collectionValue(items) };
  }).sort((a, b) => b.items.length - a.items.length || a.platform.localeCompare(b.platform, "pt-PT"));

  return <div className="space-y-6 pb-6"><meta name="server-timing" content={toServerTimingHeader(measured.spans, measured.totalMs)} />
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">BIBLIOTECA</p><h1 className="section-title">A coleção, por plataformas</h1><p className="mt-1 text-sm text-slate-600">{games.length} jogos organizados pelas consolas que tens.</p></div><Link href="/collection/games" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white hover:bg-emerald-800">Todos os jogos<ArrowRight className="h-4 w-4" /></Link></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-3 flex items-center gap-2"><LibraryBig className="h-4 w-4 text-emerald-800" /><h2 className="text-sm font-black text-slate-900">Pesquisa global</h2></div><QuickSearch games={games} initialSearch={searchParamsToString(query)} /></section>
    <section aria-label="Plataformas" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {platforms.map(({ platform, slug, items, audited, value }) => {
        const progress = items.length ? Math.round(audited / items.length * 100) : 0;
        return <Link key={platform} href={`/platform/${slug}`} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
          <span className="grid h-[4.25rem] w-[4.25rem] shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50"><PlatformArtwork platform={platform} className="h-full w-full" /></span>
          <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm font-extrabold text-slate-950">{displayPlatform(platform)}</strong><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-800" /></span><span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500"><span>{items.length} jogos</span><span>{value === null ? "Valor n/d" : formatEuro(value)}</span></span><span className="mt-2 flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-emerald-800" style={{ width: `${progress}%` }} /></span><span className="shrink-0 text-[10px] font-semibold text-slate-500">{audited}/{items.length} auditados</span></span></span>
        </Link>;
      })}
    </section>
  </div>;
}
