import Link from "next/link";
import { PlatformArtwork } from "@/components/artwork";
import { WishlistArtwork } from "@/components/wishlist-artwork";
import { QuickSearch } from "@/components/quick-search";
import { getAllGames, getComponentCompletionQueue, getStats, getWantlist } from "@/lib/data/collection-service";
import { displayPlatform, platformReleaseYear, sortPlatformsByRelease } from "@/lib/data/platforms";
import { formatEuro, gameCountLabel } from "@/lib/format";
import { getLibrary } from "@/lib/library-store";
import { toQuickSearchableGame } from "@/lib/quick-search.logic";
import { resolveWishlistArtwork } from "@/lib/wishlist-artwork";
import { resolveNextObjective } from "@/lib/next-objective.logic";
import { suggestNextObjective } from "@/lib/next-objective-suggestion.logic";
import { clearNextObjective, setNextObjective } from "@/lib/library-actions";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { isOrderedWishlistTarget } from "@/lib/wishlist-acquisition.logic";

export default async function HomePage() {
  const [stats, games, wantlist, library, completion] = await Promise.all([
    getStats(),
    getAllGames(),
    getWantlist(),
    getLibrary(),
    getComponentCompletionQueue(),
  ]);
  const platforms = sortPlatformsByRelease(stats.platforms);
  const incompleteIds = new Set(completion.active.map((need) => need.collectionId));
  const searchGames = games.map((game) => toQuickSearchableGame(game, incompleteIds.has(game.collectionId)));
  const nextObjective = resolveNextObjective(library.nextObjective ?? null, wantlist);
  const objectiveSuggestion = suggestNextObjective(
    wantlist,
    games,
    library.collectionLists,
    nextObjective?.targetId ?? "",
  );
  const orderedWishlist = wantlist.filter(isOrderedWishlistTarget);
  const activeWishlist = wantlist
    .filter((target) => !isOrderedWishlistTarget(target) && target.planState !== "inactive" && target.matchState !== "acquired")
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
    .filter((entry) => (entry.action === "collection.add" || entry.action === "wishlist.receive") && keptIds.has(entry.entityId))
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

    {nextObjective ? <section className="collection-panel overflow-hidden border-[#cdd9c7] bg-[#f7faef]">
      <div className="grid gap-4 p-4 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center">
        <WishlistArtwork title={nextObjective.title} platform={nextObjective.platform} artworkSrc={resolveWishlistArtwork(nextObjective)} className="h-24 w-[76px] rounded-xl" />
        <div className="min-w-0">
          <p className="eyebrow text-[#315b47]">PRÓXIMO OBJETIVO</p>
          <h2 className="mt-1 truncate text-lg font-black text-slate-950">{nextObjective.title}</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{displayPlatform(nextObjective.platform)}{nextObjective.targetVersion ? " · " + nextObjective.targetVersion : ""}</p>
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{nextObjective.reason || nextObjective.notes || "Objetivo escolhido manualmente na Wishlist."}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#6d8a78]">Prioridade · {nextObjective.priority || "Média"}</p>
        </div>
        <div className="flex gap-2 sm:flex-col sm:items-stretch">
          <Link
            href={"/wish/" + encodeURIComponent(nextObjective.targetId) + "?" + new URLSearchParams({ platform: nextObjective.platform, title: nextObjective.title, from: "/" }).toString()}
            className="min-h-10 flex-1 rounded-xl bg-[#17382e] px-4 py-2.5 text-center text-xs font-black text-white sm:flex-none"
          >
            Abrir objetivo
          </Link>
          <form action={clearNextObjective}>
            <input type="hidden" name="targetId" value={nextObjective.targetId} />
            <ActionSubmitButton pendingLabel="A remover…" className="min-h-10 w-full rounded-xl border border-[#ccd5c7] bg-white px-4 text-xs font-black text-slate-600">
              Remover
            </ActionSubmitButton>
          </form>
        </div>
      </div>
    </section> : activeWishlist.length > 0 && <section className="collection-panel flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="eyebrow text-slate-500">PRÓXIMO OBJETIVO</p>
        <p className="mt-1 text-sm font-black text-slate-900">Nenhum objetivo principal definido.</p>
      </div>
      <Link href="/want" className="min-h-10 rounded-xl border border-[#d8d2c5] bg-white px-4 py-2.5 text-xs font-black text-[#315b47]">Escolher na Wishlist</Link>
    </section>}

    {objectiveSuggestion && <section className="collection-panel border-sky-200 bg-sky-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <WishlistArtwork title={objectiveSuggestion.target.title} platform={objectiveSuggestion.target.platform} artworkSrc={resolveWishlistArtwork(objectiveSuggestion.target)} className="h-20 w-16 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="eyebrow text-sky-700">SUGESTÃO AUTOMÁTICA</p>
            <h2 className="mt-1 truncate text-sm font-black text-slate-950">{objectiveSuggestion.target.title}</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{displayPlatform(objectiveSuggestion.target.platform)}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-sky-900">{objectiveSuggestion.reason}</p>
          </div>
        </div>
        <form action={setNextObjective}>
          <input type="hidden" name="targetId" value={objectiveSuggestion.target.targetId} />
          <input type="hidden" name="title" value={objectiveSuggestion.target.title} />
          <input type="hidden" name="platform" value={objectiveSuggestion.target.platform} />
          <ActionSubmitButton pendingLabel="A definir…" className="min-h-10 rounded-xl bg-sky-900 px-4 text-xs font-black text-white">
            {nextObjective ? "Trocar para este" : "Usar como objetivo"}
          </ActionSubmitButton>
        </form>
      </div>
      <p className="mt-3 text-[10px] font-semibold leading-4 text-slate-400">
        Sugestão transparente baseada na tua própria coleção: primeiro tenta fechar listas/objetivos, depois continuar séries que já tens e, por fim, usa a prioridade da Wishlist. Nunca altera o objetivo sem confirmação.
      </p>
    </section>}

    {orderedWishlist.length > 0 && <section className="collection-panel border-amber-200 bg-amber-50/75 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="eyebrow text-amber-700">A CAMINHO</p>
          <h2 className="mt-1 text-sm font-black text-slate-950">{orderedWishlist.length === 1 ? "1 jogo comprado por receber" : String(orderedWishlist.length) + " jogos comprados por receber"}</h2>
        </div>
        <Link href="/want" className="text-xs font-black text-amber-800">Ver encomendas →</Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {orderedWishlist.slice(0, 4).map((target) => {
          const params = new URLSearchParams({ platform: target.platform, title: target.title, from: "/want" });
          return <Link
            key={target.targetId + target.title}
            href={"/wish/" + encodeURIComponent(target.targetId) + "?" + params.toString()}
            className="rounded-xl bg-white/80 px-3 py-2 text-xs font-bold text-amber-950"
          >
            {target.title} · {displayPlatform(target.platform)}
          </Link>;
        })}
      </div>
    </section>}

    <section className="grid gap-3 lg:grid-cols-[1.25fr_.75fr]">
      <div className="collection-panel p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div><h2 className="text-sm font-black text-slate-950">Adicionados recentemente</h2><p className="mt-0.5 text-xs font-semibold text-slate-500">As últimas entradas registadas pela app.</p></div>
          <Link href="/history" className="shrink-0 text-xs font-black text-[#315b47] hover:text-[#17382e]">Ver histórico</Link>
        </div>
        {recentAdditions.length ? <div className="mt-3 divide-y divide-[#ece7dd]">
          {recentAdditions.map((entry) => <Link key={entry.id} href={`/game/${encodeURIComponent(entry.entityId)}`} className="flex min-w-0 items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="min-w-0"><strong className="block truncate text-sm font-black text-slate-900">{entry.title}</strong><span className="block truncate text-xs font-semibold text-slate-500">{displayPlatform(entry.platform)} · {entry.action === "wishlist.receive" ? "Recebido" : "Adicionado"}</span></span>
            <time dateTime={entry.at} className="shrink-0 text-[11px] font-bold text-slate-400">{formatHistoryDate(entry.at)}</time>
          </Link>)}
        </div> : <p className="mt-3 rounded-xl bg-[#f4f1e8] p-3 text-xs font-semibold text-slate-500">O histórico começou recentemente. Os próximos jogos adicionados aparecem aqui.</p>}
      </div>

      <div className="collection-panel p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-950">Para completar</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Peças físicas em falta nas tuas cópias.</p>
          </div>
          <Link href="/complete" className="shrink-0 text-xs font-black text-[#315b47] hover:text-[#17382e]">Ver tudo</Link>
        </div>
        {completion.active.length > 0 ? <div className="mt-3 space-y-2">
          {completion.active.slice(0, 3).map((need) => <Link
            key={need.id}
            href={"/game/" + encodeURIComponent(need.collectionId)}
            className="flex items-center justify-between gap-3 rounded-xl bg-[#f4f1e8] px-3 py-2.5 transition hover:bg-[#e8ecdf]"
          >
            <span className="min-w-0">
              <strong className="block truncate text-sm font-black text-slate-950">{need.title}</strong>
              <span className="block truncate text-[11px] font-semibold text-slate-500">{need.label} · {displayPlatform(need.platform)}</span>
            </span>
            <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-amber-700">
              {need.status === "found" ? "Encontrado" : need.status === "purchased" ? "Comprado" : "Em falta"}
            </span>
          </Link>)}
          {completion.active.length > 3 && <p className="px-1 text-[11px] font-bold text-slate-400">+{completion.active.length - 3} outras peças</p>}
        </div> : <p className="mt-3 rounded-xl bg-[#f4f1e8] p-3 text-xs font-semibold text-slate-500">Nenhuma peça confirmada em falta.</p>}
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

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", timeZone: "Europe/Lisbon" }).format(new Date(value));
}

function Summary({ value, label }: { value: string; label: string }) {
  return <div className="summary-card"><p className="truncate text-lg font-black tracking-tight text-slate-950 sm:text-2xl">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p></div>;
}
