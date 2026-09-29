import Link from "next/link";
import { PlatformArtwork } from "@/components/artwork";
import { QuickSearch } from "@/components/quick-search";
import { getAllGames, getStats } from "@/lib/data/collection-service";
import { displayPlatform, platformReleaseYear, sortPlatformsByRelease } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";

export default async function HomePage() {
  const [stats, games] = await Promise.all([getStats(), getAllGames()]);
  const platforms = sortPlatformsByRelease(stats.platforms);

  return <div className="space-y-6 pb-8">
    <header>
      <p className="text-xs font-black uppercase tracking-[.14em] text-emerald-800">Retro Collection</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">A tua coleção.</h1>
      <p className="mt-1 text-sm text-slate-500">Abre uma consola. Vê o que tens. Vê o que falta.</p>
    </header>

    <section className="grid grid-cols-3 gap-2">
      <Summary value={String(stats.platforms.length)} label="consolas" />
      <Summary value={String(stats.kept)} label="jogos" />
      <Summary value={formatEuro(stats.marketValueEur)} label="valor total" />
    </section>

    <QuickSearch games={games} />

    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><h2 className="text-lg font-black text-slate-950">Consolas</h2><p className="text-xs text-slate-500">Por ano de lançamento</p></div>
        <Link href="/want" className="text-xs font-bold text-emerald-800">Wishlist →</Link>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((platform) => <Link key={platform.platform} href={"/platform/" + platform.slug} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:border-emerald-300">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50"><PlatformArtwork platform={platform.platform} className="h-full w-full" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2"><strong className="truncate text-sm font-black text-slate-950">{displayPlatform(platform.platform)}</strong><span className="text-[11px] font-bold text-slate-400">{platformReleaseYear(platform.platform) < 9990 ? platformReleaseYear(platform.platform) : "—"}</span></span>
            <span className="mt-1 flex gap-3 text-xs text-slate-500"><span>{platform.count} jogos</span><span>{formatEuro(platform.marketValueEur)}</span></span>
          </span>
        </Link>)}
      </div>
    </section>
  </div>;
}

function Summary({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4"><p className="truncate text-lg font-black tracking-tight text-slate-950 sm:text-2xl">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p></div>;
}
