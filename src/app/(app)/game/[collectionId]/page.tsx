import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { GameArtwork } from "@/components/artwork";
import { MarketSearchLinks } from "@/components/market-search-links";
import { editGame, removeCollectionGame } from "@/lib/library-actions";
import { getGame } from "@/lib/data/collection-service";
import { displayPlatform, platformSlug } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import { getGameResearch } from "@/lib/game-research";
import { getSafeListReturnPath } from "@/lib/list-url-state.logic";

export default async function GamePage({ params, searchParams }: { params: Promise<{ collectionId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ collectionId }, query] = await Promise.all([params, searchParams]);
  const game = await getGame(decodeURIComponent(collectionId));
  if (!game) notFound();

  const returnTo = getSafeListReturnPath(query.from) ?? `/platform/${platformSlug(game.platform)}`;
  const research = await getGameResearch(game);
  const metadata = research.metadata;
  const year = metadata?.firstReleaseDate ? metadata.firstReleaseDate.slice(0, 4) : "—";

  return <div className="mx-auto max-w-4xl space-y-5 pb-10">
    <Link href={returnTo || "/collection"} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft className="h-3.5 w-3.5" />Voltar</Link>

    <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-6">
      <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} className="mx-auto h-[300px] w-[220px] rounded-xl bg-slate-50 object-contain sm:mx-0" eager />
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[.14em] text-emerald-800">{displayPlatform(game.platform)}</p>
        <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-slate-950">{game.title}</h1>
        <dl className="mt-5 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-slate-500">Ano</dt><dd className="font-bold text-slate-900">{year}</dd>
          <dt className="text-slate-500">Developer</dt><dd className="font-bold text-slate-900">{metadata?.developers.join(", ") || "—"}</dd>
          <dt className="text-slate-500">Publisher</dt><dd className="font-bold text-slate-900">{metadata?.publishers.join(", ") || "—"}</dd>
          <dt className="text-slate-500">Género</dt><dd className="font-bold text-slate-900">{metadata?.genres.slice(0, 2).join(" · ") || "—"}</dd>
          <dt className="text-slate-500">Valor</dt><dd className="text-lg font-black text-slate-950">{formatEuro(research.estimate.value ?? game.marketValueEur)}</dd>
        </dl>
        <div className="mt-5"><MarketSearchLinks title={game.title} platform={game.platform} compact /></div>
        {research.estimate.productUrl && <a href={research.estimate.productUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-800">Abrir PriceCharting <ExternalLink className="h-3.5 w-3.5" /></a>}
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-black text-slate-950">A minha cópia</h2>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <Info label="Collection ID" value={game.collectionId} />
        <Info label="Região / edição" value={[game.region, game.edition].filter(Boolean).join(" · ")} />
        <Info label="Completude" value={game.overallStatus} />
        <Info label="Condição" value={game.conditionGrade} />
        <Info label="Preço pago" value={game.purchase?.totalPaidEur !== null && game.purchase?.totalPaidEur !== undefined ? formatEuro(game.purchase.totalPaidEur) : formatEuro(game.allocatedCostEur)} />
        <Info label="Compra" value={[game.purchase?.date, game.purchase?.source].filter(Boolean).join(" · ")} />
      </dl>
      {game.notes && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{game.notes}</p>}
    </section>

    <details className="rounded-2xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-black text-slate-900">Editar a minha cópia</summary>
      <form action={editGame} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="collectionId" value={game.collectionId} />
        <Field name="region" label="Região" value={game.region} />
        <Field name="edition" label="Edição" value={game.edition} />
        <Field name="language" label="Idioma" value={game.language} />
        <Field name="overallStatus" label="Completude" value={game.overallStatus} />
        <Field name="conditionGrade" label="Condição" value={game.conditionGrade} />
        <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" defaultValue={game.notes} className="field-input min-h-24" /></label>
        <button className="min-h-11 rounded-xl bg-emerald-950 px-4 text-sm font-black text-white sm:col-span-2">Guardar alterações</button>
      </form>
    </details>

    <details className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <summary className="cursor-pointer text-sm font-black text-rose-900">Remover da coleção</summary>
      <p className="mt-2 text-xs text-rose-800">Remove este registo da app. Usa apenas quando tens a certeza.</p>
      <form action={removeCollectionGame} className="mt-3">
        <input type="hidden" name="collectionId" value={game.collectionId} />
        <button className="min-h-10 rounded-xl bg-rose-800 px-4 text-sm font-black text-white">Remover {game.title}</button>
      </form>
    </details>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{value || "—"}</p></div>;
}

function Field({ name, label, value }: { name: string; label: string; value: string }) {
  return <label><span className="field-label">{label}</span><input name={name} defaultValue={value} className="field-input" /></label>;
}
