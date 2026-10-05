import Link from "next/link";
import { Suspense } from "react";
import { PlatformArtwork } from "@/components/artwork";
import { QuickSearch } from "@/components/quick-search";
import { getAllGames, getStats, getWantlist } from "@/lib/data/collection-service";
import { displayPlatform, platformReleaseYear, sortPlatformsByRelease } from "@/lib/data/platforms";
import { formatEuro, gameCountLabel } from "@/lib/format";
import { getCollectionListGames } from "@/lib/game-list-data";
import { getLibrary } from "@/lib/library-store";
import { toQuickSearchableGame } from "@/lib/quick-search.logic";
import { resolveWishlistArtwork } from "@/lib/wishlist-artwork";

export default async function HomePage() {
  const [stats, games, wantlist, library] = await Promise.all([getStats(), getAllGames(), getWantlist(), getLibrary()]);
  const platforms = sortPlatformsByRelease(stats.platforms);
  const searchGames = games.map(toQuickSearchableGame);
  const activeWishlist = wantlist
    .filter((target) => target.planState !== "inactive" && target.matchState !== "acquired")
    .map((target) => ({
      title: target.title,
      platform: target.platform,
      targetId: target.targetId,
      targetVersion: target.targetVersion,
      priority: target.priority,
      artworkSrc: resolveWishlistArtwork(target),
    }));

  const keptIds = new Set(games.filter((game) => game.keepStatus === "Collection").map((game) => game.collectionId));
  const recentAdditions = [...library.history]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((entry) => (entry.action === "collection.add" || entry.action === "wishlist.purchase") && keptIds.has(entry.entityId))
    .slice(0, 4);

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

    <div className="rounded-2xl bg-[#17382e] p-3 md:hidden"><QuickSearch games={searchGames} wishlist={activeWishlist} /></div>

    <section className="grid gap-3 lg:grid-cols-[1.25fr_.75fr]">
      <div className="collection-panel p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div><h2 className="text-sm font-black text-slate-950">Adicionados recentemente</h2><p className="mt-0.5 text-xs font-semibold text-slate-500">As últimas entradas registadas pela app.</p></div>
          <Link href="/history" className="shrink-0 text-xs font-black text-[#315b47] hover:text-[#17382e]">Ver histórico</Link>
        </div>
        {recentAdditions.length ? <div className="mt-3 divide-y divide-[#ece7dd]">
          {recentAdditions.map((entry) => <Link key={entry.id} href={`/game/${encodeURIComponent(entry.entityId)}`} className="flex min-w-0 items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="min-w-0"><strong className="block truncate text-sm font-black text-slate-900">{entry.title}</strong><span className="block truncate text-xs font-semibold text-slate-500">{displayPlatform(entry.platform)} · {entry.action === "wishlist.purchase" ? "Comprado" : "Adicionado"}</span></span>
            <time dateTime={entry.at} className="shrink-0 text-[11px] font-bold text-slate-400">{formatHistoryDate(entry.at)}</time>
          </Link>)}
        </div> : <p className="mt-3 rounded-xl bg-[#f4f1e8] p-3 text-xs font-semibold text-slate-500">O histórico começou recentemente. Os próximos jogos adicionados aparecem aqui.</p>}
      </div>

      <div className="collection-panel p-4">
        <h2 className="text-sm font-black text-slate-950">Para completar</h2>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">Dados da coleção que ainda merecem atenção.</p>
        <Suspense fallback={<AttentionFallback />}>
          <HomeAttention />
        </Suspense>
      </div>
    </section>

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

async function HomeAttention() {
  const games = await getCollectionListGames();
  const attention = [
    { label: "Sem valor de mercado", value: games.filter((game) => game.currentValueEur === null).length, href: "/collection/games?missingValue=1" },
    { label: "Por rever", value: games.filter((game) => game.needsReview).length, href: "/collection/games?review=1" },
    { label: "Sem preço de compra", value: games.filter((game) => game.purchasePaidEur === null).length, href: "/collection/games?missingPurchase=1" },
  ];

  return <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-1">
    {attention.map((item) => <Link key={item.label} href={item.href} className="group rounded-xl bg-[#f4f1e8] px-3 py-2.5 transition hover:bg-[#e8ecdf] lg:flex lg:items-center lg:justify-between lg:gap-3">
      <span><strong className="block text-lg font-black text-slate-950">{item.value}</strong><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</span></span>
      <span className="mt-1 block text-[10px] font-black text-[#315b47] lg:mt-0">VER →</span>
    </Link>)}
  </div>;
}

function AttentionFallback() {
  return <div aria-label="A carregar dados da coleção" className="mt-3 grid animate-pulse grid-cols-3 gap-2 lg:grid-cols-1">
    {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-16 rounded-xl bg-[#f4f1e8]" />)}
  </div>;
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", timeZone: "Europe/Lisbon" }).format(new Date(value));
}

function Summary({ value, label }: { value: string; label: string }) {
  return <div className="summary-card"><p className="truncate text-lg font-black tracking-tight text-slate-950 sm:text-2xl">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p></div>;
}
