import Link from "next/link";
import { PlatformArtwork } from "@/components/artwork";
import { QuickSearch } from "@/components/quick-search";
import { getAllGames, getStats } from "@/lib/data/collection-service";
import { displayPlatform, platformReleaseYear, sortPlatformsByRelease } from "@/lib/data/platforms";
import { formatEuro, gameCountLabel } from "@/lib/format";

export default async function HomePage() {
  const [stats, games] = await Promise.all([getStats(), getAllGames()]);
  const platforms = sortPlatformsByRelease(stats.platforms);

  return <div className="space-y-7 pb-8">
    <header className="collection-hero">
      <p className="eyebrow">RETRO COLLECTION</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">A tua coleção.</h1>
      <p className="mt-1 max-w-xl text-sm font-semibold text-slate-500">Abre uma consola. Vê o que tens. Vê o que falta.</p>
    </header>

    <section className="grid grid-cols-3 gap-2">
      <Summary value={String(stats.platforms.length)} label="consolas" />
      <Summary value={String(stats.kept)} label={stats.kept === 1 ? "jogo" : "jogos"} />
      <Summary value={formatEuro(stats.marketValueEur)} label="valor total" />
    </section>

    <div className="rounded-2xl bg-[#17382e] p-3 md:hidden"><QuickSearch games={games} /></div>

    <section>
      <div className="mb-4"><h2 className="text-xl font-black text-slate-950">Consolas</h2><p className="text-xs font-semibold text-slate-500">Por ano de lançamento</p></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {platforms.map((platform) => <Link key={platform.platform} href={"/platform/" + platform.slug} className="console-card group">
          <span className="grid h-24 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/65"><PlatformArtwork platform={platform.platform} className="h-full w-full" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2"><strong className="truncate text-base font-black text-slate-950">{displayPlatform(platform.platform)}</strong><span className="text-xs font-black text-slate-400">{platformReleaseYear(platform.platform) < 9990 ? platformReleaseYear(platform.platform) : "—"}</span></span>
            <span className="mt-2 flex gap-3 text-xs font-semibold text-slate-500"><span>{gameCountLabel(platform.count)}</span><span>{formatEuro(platform.marketValueEur)}</span></span>
          </span>
        </Link>)}
      </div>
    </section>
  </div>;
}

function Summary({ value, label }: { value: string; label: string }) {
  return <div className="summary-card"><p className="truncate text-lg font-black tracking-tight text-slate-950 sm:text-2xl">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p></div>;
}
