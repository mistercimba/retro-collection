import Link from "next/link";
import { PlatformArtwork } from "@/components/artwork";
import { WishlistArtwork } from "@/components/wishlist-artwork";
import { QuickSearch } from "@/components/quick-search";
import { getAllGames, getComponentCompletionQueue, getWantlist } from "@/lib/data/collection-service";
import { displayPlatform, platformReleaseYear, platformSlug, sortPlatformsByRelease } from "@/lib/data/platforms";
import { gameCountLabel } from "@/lib/format";
import { getLibrary } from "@/lib/library-store";
import { toQuickSearchableGame } from "@/lib/quick-search.logic";
import { resolveWishlistArtwork } from "@/lib/wishlist-artwork";
import { resolveNextObjective } from "@/lib/next-objective.logic";
import { suggestNextObjective } from "@/lib/next-objective-suggestion.logic";
import { buildHomeCopyAttention } from "@/lib/home-copy-attention.logic";
import { clearNextObjective, setNextObjective } from "@/lib/library-actions";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { isOrderedWishlistTarget } from "@/lib/wishlist-acquisition.logic";

export default async function HomePage() {
  const [games, wantlist, library, completion] = await Promise.all([
    getAllGames(),
    getWantlist(),
    getLibrary(),
    getComponentCompletionQueue(),
  ]);

  // The Home needs only platform names/counts for navigation, not market-value
  // aggregation. Derive these from the already loaded owned collection.
  const platformCounts = new Map<string, number>();
  for (const game of games) {
    if (game.keepStatus !== "Collection") continue;
    platformCounts.set(game.platform, (platformCounts.get(game.platform) ?? 0) + 1);
  }
  const platforms = sortPlatformsByRelease(
    [...platformCounts].map(([platform, count]) => ({ platform, slug: platformSlug(platform), count }))
  );
  const incompleteIds = new Set(completion.active.map((need) => need.collectionId));
  const searchGames = games.map((game) => toQuickSearchableGame(game, incompleteIds.has(game.collectionId)));
  const nextObjective = resolveNextObjective(library.nextObjective ?? null, wantlist);
  const objectiveSuggestion = nextObjective
    ? null
    : suggestNextObjective(wantlist, games, library.collectionLists);
  const orderedWishlist = wantlist.filter(isOrderedWishlistTarget);
  const copyAttention = buildHomeCopyAttention(games, completion.active);
  const hasCopyReview = games.some((game) => game.keepStatus === "Collection" && game.needsReview);
  const hasComponentNeeds = completion.active.length > 0;
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
    .filter((entry) =>
      (entry.action === "collection.add" || entry.action === "wishlist.receive") && keptIds.has(entry.entityId)
    )
    .slice(0, 4);

  return <div className="space-y-5 pb-8">
    <header className="flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="eyebrow">RETRO COLLECTION</p>
        <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Início</h1>
      </div>
      <Link href="/collection" className="min-h-10 shrink-0 rounded-xl border border-[#d8d2c5] bg-white px-3 py-2.5 text-xs font-black text-[#315b47] hover:border-[#9aab9e]">
        Ver coleção →
      </Link>
    </header>

    <div className="rounded-2xl bg-[#17382e] p-3 md:hidden"><QuickSearch games={searchGames} wishlist={activeWishlist} /></div>

    {nextObjective ? <section aria-labelledby="home-objective-title" className="collection-panel overflow-hidden border-[#cdd9c7] bg-[#f7faef]">
      <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 p-3.5 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-4">
        <WishlistArtwork title={nextObjective.title} platform={nextObjective.platform} artworkSrc={resolveWishlistArtwork(nextObjective)} className="h-20 w-16 rounded-xl sm:h-24 sm:w-[76px]" />
        <div className="min-w-0">
          <p className="eyebrow text-[#315b47]">PRÓXIMO OBJETIVO</p>
          <h2 id="home-objective-title" className="mt-1 line-clamp-2 break-words text-base font-black text-slate-950 sm:text-lg">{nextObjective.title}</h2>
          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-600">
            {displayPlatform(nextObjective.platform)}{nextObjective.targetVersion ? " · " + nextObjective.targetVersion : ""}
          </p>
          {(nextObjective.reason || nextObjective.notes) && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{nextObjective.reason || nextObjective.notes}</p>}
        </div>
        <div className="col-span-2 flex min-w-0 flex-wrap gap-2 sm:col-span-1 sm:flex-col sm:items-stretch">
          <Link
            href={"/wish/" + encodeURIComponent(nextObjective.targetId) + "?" + new URLSearchParams({ platform: nextObjective.platform, title: nextObjective.title, from: "/" }).toString()}
            className="flex min-h-10 flex-1 items-center justify-center rounded-xl bg-[#17382e] px-4 py-2 text-center text-xs font-black text-white sm:flex-none"
          >
            Abrir objetivo
          </Link>
          <form action={clearNextObjective} className="flex-1 sm:flex-none">
            <input type="hidden" name="targetId" value={nextObjective.targetId} />
            <ActionSubmitButton pendingLabel="A remover…" className="min-h-10 w-full rounded-xl border border-[#ccd5c7] bg-white px-4 text-xs font-black text-slate-600">
              Remover
            </ActionSubmitButton>
          </form>
        </div>
      </div>
    </section> : objectiveSuggestion ? <section aria-labelledby="home-objective-title" className="collection-panel border-[#cdd9c7] bg-[#f7faef] p-4">
      <div className="flex min-w-0 flex-wrap items-start gap-3 sm:flex-nowrap">
        <WishlistArtwork title={objectiveSuggestion.target.title} platform={objectiveSuggestion.target.platform} artworkSrc={resolveWishlistArtwork(objectiveSuggestion.target)} className="h-20 w-16 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-[#315b47]">SUGESTÃO DE PRÓXIMO OBJETIVO</p>
          <h2 id="home-objective-title" className="mt-1 line-clamp-2 break-words text-sm font-black text-slate-950">{objectiveSuggestion.target.title}</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">{displayPlatform(objectiveSuggestion.target.platform)}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{objectiveSuggestion.reason}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={setNextObjective}>
          <input type="hidden" name="targetId" value={objectiveSuggestion.target.targetId} />
          <input type="hidden" name="title" value={objectiveSuggestion.target.title} />
          <input type="hidden" name="platform" value={objectiveSuggestion.target.platform} />
          <ActionSubmitButton pendingLabel="A definir…" className="min-h-10 rounded-xl bg-[#17382e] px-4 text-xs font-black text-white">
            Definir como objetivo
          </ActionSubmitButton>
        </form>
        <Link href="/want" className="inline-flex min-h-10 items-center px-2 text-xs font-black text-[#315b47]">Escolher outro na Wishlist →</Link>
      </div>
    </section> : activeWishlist.length > 0 ? <section aria-labelledby="home-objective-title" className="collection-panel flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="eyebrow">PRÓXIMO OBJETIVO</p>
        <h2 id="home-objective-title" className="mt-1 text-sm font-black text-slate-900">Ainda não tens um objetivo definido.</h2>
      </div>
      <Link href="/want" className="inline-flex min-h-10 items-center rounded-xl bg-[#17382e] px-4 text-xs font-black text-white">Escolher na Wishlist</Link>
    </section> : null}

    {(copyAttention.length > 0 || orderedWishlist.length > 0) && <section aria-labelledby="home-attention-title" className="space-y-3">
      <h2 id="home-attention-title" className="text-lg font-black text-slate-950">A tua atenção</h2>
      <div className={copyAttention.length > 0 && orderedWishlist.length > 0 ? "grid gap-3 lg:grid-cols-2" : "grid gap-3"}>
        {copyAttention.length > 0 && <article className="collection-panel min-w-0 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-black text-slate-950">Cópias a rever ou completar</h3>
            <Link href={hasComponentNeeds ? "/complete" : "/collection/games?review=1"} className="text-xs font-black text-[#315b47]">{hasComponentNeeds ? "Ver peças →" : "Ver revisões →"}</Link>
          </div>
          <div className="mt-3 space-y-2">
            {copyAttention.slice(0, 3).map((item) => <Link
              key={item.collectionId}
              href={"/game/" + encodeURIComponent(item.collectionId)}
              className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-[#f4f1e8] p-3 transition-colors hover:bg-[#e8ecdf]"
            >
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-black text-slate-950">{item.title}</strong>
                <span className="mt-0.5 block line-clamp-2 break-words text-xs font-semibold leading-5 text-slate-600">{displayPlatform(item.platform)} · {item.summary}</span>
              </span>
              <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-black text-[#315b47]">
                {item.kind === "missing" ? "Em falta" : item.kind === "review" ? "Rever" : "A acompanhar"}
              </span>
            </Link>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold">
            {copyAttention.length > 3 && <span className="text-slate-500">Mostradas 3 de {copyAttention.length} cópias</span>}
            {hasCopyReview && hasComponentNeeds && <Link href="/collection/games?review=1" className="text-[#315b47]">Cópias por rever →</Link>}
          </div>
        </article>}

        {orderedWishlist.length > 0 && <article className="collection-panel min-w-0 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-black text-slate-950">Compras por receber</h3>
            <Link href="/want" className="text-xs font-black text-[#315b47]">Ver Wishlist →</Link>
          </div>
          <div className="mt-3 space-y-2">
            {orderedWishlist.slice(0, 3).map((target) => {
              const params = new URLSearchParams({ platform: target.platform, title: target.title, from: "/want" });
              return <Link key={target.platform + ":" + target.title + ":" + target.targetId}
                href={"/wish/" + encodeURIComponent(target.targetId) + "?" + params.toString()}
                className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-3 transition-colors hover:bg-amber-100"
              >
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-black text-slate-950">{target.title}</strong>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-amber-900">{displayPlatform(target.platform)}</span>
                </span>
                <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-black text-amber-900">Por receber</span>
              </Link>;
            })}
          </div>
          {orderedWishlist.length > 3 && <Link href="/want" className="mt-3 inline-block text-xs font-bold text-amber-900">Ver restantes encomendas →</Link>}
        </article>}
      </div>
    </section>}

    <section aria-labelledby="home-recent-title" className="collection-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="home-recent-title" className="text-sm font-black text-slate-950">Adicionados recentemente</h2>
        <Link href="/history" className="text-xs font-black text-[#315b47]">Ver histórico →</Link>
      </div>
      {recentAdditions.length > 0 ? <div className="mt-3 divide-y divide-[#ece7dd]">
        {recentAdditions.map((entry) => <Link key={entry.id} href={"/game/" + encodeURIComponent(entry.entityId)}
          className="flex min-w-0 items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-black text-slate-900">{entry.title}</strong>
            <span className="block truncate text-xs font-semibold text-slate-500">{displayPlatform(entry.platform)} · {entry.action === "wishlist.receive" ? "Recebido" : "Adicionado"}</span>
          </span>
          <time dateTime={entry.at} className="shrink-0 text-[11px] font-bold text-slate-500">{formatHistoryDate(entry.at)}</time>
        </Link>)}
      </div> : <p className="mt-3 text-sm text-slate-600">Ainda não há novas entradas registadas no histórico.</p>}
    </section>

    <section aria-labelledby="home-platforms-title">
      <h2 id="home-platforms-title" className="mb-3 text-lg font-black text-slate-950">Consolas</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {platforms.map((platform) => <Link key={platform.platform} href={"/platform/" + platform.slug} className="console-card group">
          <span className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/65">
            <PlatformArtwork platform={platform.platform} className="h-full w-full" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-baseline justify-between gap-2">
              <strong className="min-w-0 truncate text-sm font-black text-slate-950 sm:text-base">{displayPlatform(platform.platform)}</strong>
              <span className="shrink-0 text-xs font-bold text-slate-500">{platformReleaseYear(platform.platform) < 9990 ? platformReleaseYear(platform.platform) : "—"}</span>
            </span>
            <span className="mt-1 block text-xs font-semibold text-slate-600">{gameCountLabel(platform.count)}</span>
          </span>
        </Link>)}
      </div>
    </section>
  </div>;
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", timeZone: "Europe/Lisbon" }).format(new Date(value));
}
