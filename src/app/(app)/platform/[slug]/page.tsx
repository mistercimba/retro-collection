import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { GameArtwork } from "@/components/artwork";
import { MarketSearchLinks } from "@/components/market-search-links";
import { getCollectionListGames } from "@/lib/game-list-data";
import { getWantlist } from "@/lib/data/collection-service";
import { displayPlatform, platformFromSlug, platformReleaseYear } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import { getGameMetadata } from "@/lib/game-metadata";
import { editWishlistGame, purchaseWishlistGame, removeWishlistGame } from "@/lib/library-actions";

export default async function PlatformPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ slug }, query, allGames, wantlist] = await Promise.all([params, searchParams, getCollectionListGames(), getWantlist()]);
  const knownPlatforms = [...new Set([...allGames.map((game) => game.platform), ...wantlist.map((target) => target.platform)])];
  const platform = platformFromSlug(slug, knownPlatforms);
  if (!platform) notFound();

  const tab = query.tab === "wishlist" ? "wishlist" : "collection";
  const rawQuery = typeof query.q === "string" ? query.q : "";
  const q = rawQuery.trim().toLocaleLowerCase("pt-PT");
  const platformGames = allGames.filter((game) => game.platform === platform);
  const platformTargets = wantlist.filter((target) => target.platform === platform && target.planState !== "inactive" && target.matchState !== "acquired");
  const filteredGames = q ? platformGames.filter((game) => game.title.toLocaleLowerCase("pt-PT").includes(q)) : platformGames;
  const filteredTargets = q ? platformTargets.filter((target) => target.title.toLocaleLowerCase("pt-PT").includes(q)) : platformTargets;
  const value = platformGames.reduce((sum, game) => sum + (game.currentValueEur ?? 0), 0);

  return <div className="space-y-4 pb-8">
    <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft className="h-3.5 w-3.5" />Consolas</Link>

    <header>
      <div className="flex items-baseline gap-3"><h1 className="text-2xl font-black text-slate-950">{displayPlatform(platform)}</h1><span className="text-sm font-bold text-slate-400">{platformReleaseYear(platform) < 9990 ? platformReleaseYear(platform) : ""}</span></div>
      <p className="mt-1 text-sm text-slate-500">{platformGames.length} jogos · {formatEuro(value)}</p>
    </header>

    <nav className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
      <Link href={"/platform/" + slug} className={"rounded-lg px-3 py-2 text-center text-sm font-black " + (tab === "collection" ? "bg-emerald-950 text-white" : "text-slate-600")}>Coleção · {platformGames.length}</Link>
      <Link href={"/platform/" + slug + "?tab=wishlist"} className={"rounded-lg px-3 py-2 text-center text-sm font-black " + (tab === "wishlist" ? "bg-rose-700 text-white" : "text-slate-600")}>Wishlist · {platformTargets.length}</Link>
    </nav>

    <form className="flex gap-2">
      <input type="hidden" name="tab" value={tab} />
      <input name="q" defaultValue={rawQuery} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600" placeholder={tab === "collection" ? "Procurar nesta coleção…" : "Procurar nesta wishlist…"} />
      <button className="rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold">Procurar</button>
    </form>

    {tab === "collection" ? <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {filteredGames.length ? filteredGames.map((game) => {
        const metadata = getGameMetadata(game.collectionId);
        const genres = metadata?.matchStatus === "matched" ? metadata.genres.slice(0, 2).join(" · ") : "—";
        return <Link key={game.collectionId} href={"/game/" + encodeURIComponent(game.collectionId) + "?from=" + encodeURIComponent("/platform/" + slug)} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 hover:bg-slate-50">
          <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} className="h-14 w-11 rounded-lg bg-slate-50" />
          <span className="min-w-0"><strong className="block truncate text-sm text-slate-950">{game.title}</strong><span className="mt-0.5 block truncate text-xs text-slate-500">{genres}</span></span>
          <strong className="text-sm text-slate-900">{formatEuro(game.currentValueEur)}</strong>
        </Link>;
      }) : <p className="p-4 text-sm text-slate-500">Nenhum jogo encontrado.</p>}
    </div> : <div className="space-y-2">
      {filteredTargets.length ? filteredTargets.map((target) => <article key={target.platform + ":" + target.targetId + ":" + target.title} className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="text-sm font-black text-slate-950">{target.title}</h2><p className="mt-1 text-xs text-slate-500">{target.priority || "Sem prioridade"}{target.targetVersion ? " · " + target.targetVersion : ""}</p></div>
          <div className="shrink-0 text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Máximo</p><p className="text-lg font-black text-rose-700">{target.priceCeilingEur === null ? "—" : formatEuro(target.priceCeilingEur)}</p></div>
        </div>
        <div className="mt-3"><MarketSearchLinks title={target.title} platform={target.platform} compact context="wantlist" /></div>

        <details className="mt-3 border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-xs font-black text-slate-700">Editar wishlist</summary>
          <form action={editWishlistGame} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="targetId" value={target.targetId} />
            <input type="hidden" name="title" value={target.title} />
            <input type="hidden" name="platform" value={target.platform} />
            <label><span className="field-label">Prioridade</span><select name="priority" defaultValue={target.priority || "Média"} className="field-input"><option>Alta</option><option>Média</option><option>Baixa</option><option>Grail</option></select></label>
            <Input name="priceCeilingEur" label="Máximo que pago (€)" type="number" step="0.01" defaultValue={target.priceCeilingEur ?? ""} />
            <Input name="targetVersion" label="Versão alvo" defaultValue={target.targetVersion} />
            <Input name="reason" label="Porque quero" defaultValue={target.reason} />
            <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" defaultValue={target.notes} className="field-input min-h-20" /></label>
            <button className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 sm:col-span-2">Guardar wishlist</button>
          </form>
        </details>

        <details className="mt-3 border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-xs font-black text-emerald-900">Comprei este jogo</summary>
          <form action={purchaseWishlistGame} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="targetId" value={target.targetId} />
            <input type="hidden" name="title" value={target.title} />
            <input type="hidden" name="platform" value={target.platform} />
            <Input name="paid" label="Preço pago (€)" type="number" step="0.01" required />
            <Input name="source" label="Onde comprei" placeholder="Feira, Vinted, CeX…" />
            <Input name="purchaseDate" label="Data" type="date" />
            <Input name="conditionGrade" label="Condição" placeholder="Bom" />
            <Input name="overallStatus" label="Completude" placeholder="CIB / Loose / Incompleto" />
            <Input name="region" label="Região" placeholder="PAL" />
            <Input name="edition" label="Edição" placeholder="Standard" />
            <Input name="language" label="Idioma" />
            <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20" /></label>
            <button className="min-h-11 rounded-xl bg-emerald-950 px-4 text-sm font-black text-white sm:col-span-2">Adicionar à coleção</button>
          </form>
        </details>

        <form action={removeWishlistGame} className="mt-2">
          <input type="hidden" name="targetId" value={target.targetId} />
          <input type="hidden" name="title" value={target.title} />
          <input type="hidden" name="platform" value={target.platform} />
          <button className="text-[11px] font-bold text-slate-400 hover:text-rose-700">Remover da wishlist</button>
        </form>
      </article>) : <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Nenhum alvo encontrado.</p>}
    </div>}
  </div>;
}

type InputProps = { name: string; label: string; type?: string; step?: string; required?: boolean; placeholder?: string; defaultValue?: string | number };

function Input({ name, label, ...props }: InputProps) {
  return <label><span className="field-label">{label}</span><input name={name} className="field-input" {...props} /></label>;
}
