import Link from "next/link";
import { PlatformArtwork } from "@/components/artwork";
import { addCollectionGame } from "@/lib/library-actions";
import { getComponentCompletionQueue, getStats } from "@/lib/data/collection-service";
import { displayPlatform, platformReleaseYear, sortPlatformsByRelease } from "@/lib/data/platforms";
import { formatEuro, gameCountLabel } from "@/lib/format";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { CollectionSelectField } from "@/components/collection-select-field";
import { CONDITION_OPTIONS, LANGUAGE_OPTIONS, REGION_OPTIONS } from "@/lib/collection-field-options";

export const metadata = { title: "Coleção" };

export default async function CollectionPage() {
  const [stats, completion] = await Promise.all([getStats(), getComponentCompletionQueue()]);
  const platforms = sortPlatformsByRelease(stats.platforms);

  return <div className="space-y-6 pb-8">
    <header className="collection-hero"><p className="eyebrow">COLEÇÃO</p><h1 className="mt-1 text-3xl font-black text-slate-950">{gameCountLabel(stats.kept)}</h1><p className="mt-1 text-sm font-semibold text-slate-500">Escolhe uma consola.</p></header>
    <Link href="/complete" className="collection-panel flex items-center justify-between gap-4 p-4 hover:bg-[#f4f1e8]">
      <span>
        <span className="eyebrow text-amber-700">PARA COMPLETAR</span>
        <strong className="mt-1 block text-base font-black text-slate-950">
          {completion.active.length === 0 ? "Nenhuma peça confirmada em falta" : completion.active.length === 1 ? "1 peça em falta" : String(completion.active.length) + " peças em falta"}
        </strong>
        <span className="mt-1 block text-xs font-semibold text-slate-500">Caixas, manuais, media e extras ligados à cópia concreta.</span>
      </span>
      <span className="shrink-0 text-xs font-black text-[#315b47]">ABRIR →</span>
    </Link>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {platforms.map((item) => <Link key={item.platform} href={"/platform/" + item.slug} className="console-card group">
        <span className="h-24 w-28 shrink-0 overflow-hidden rounded-2xl bg-white/65"><PlatformArtwork platform={item.platform} className="h-full w-full" /></span>
        <span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="truncate text-base font-black">{displayPlatform(item.platform)}</strong><span className="text-xs font-black text-slate-400">{platformReleaseYear(item.platform) < 9990 ? platformReleaseYear(item.platform) : "—"}</span></span><span className="mt-2 flex gap-3 text-xs font-semibold text-slate-500"><span>{gameCountLabel(item.count)}</span><span>{formatEuro(item.marketValueEur)}</span></span></span>
      </Link>)}
    </section>

    <details className="collection-panel p-4">
      <summary className="cursor-pointer text-sm font-black text-slate-900">+ Adicionar jogo manualmente</summary>
      <form action={addCollectionGame} className="mt-4 grid gap-2 sm:grid-cols-2">
        <Input name="title" label="Jogo" required />
        <Input name="platform" label="Consola" required placeholder="Nintendo DS" />
        <Input name="edition" label="Edição" placeholder="Standard" />
        <CollectionSelectField name="region" label="Região" options={REGION_OPTIONS} defaultValue="PAL" />
        <CollectionSelectField name="language" label="Idioma" options={LANGUAGE_OPTIONS} defaultValue="English" />
        <Input name="overallStatus" label="Completude" placeholder="CIB / Loose" />
        <CollectionSelectField name="conditionGrade" label="Condição" options={CONDITION_OPTIONS} />
        <Input name="paid" label="Preço pago (€)" type="number" step="0.01" />
        <Input name="source" label="Onde comprei" placeholder="Feira, Vinted, CeX…" />
        <Input name="purchaseDate" label="Data de compra" type="date" />
        <Input name="seller" label="Vendedor" />
        <Input name="listingUrl" label="Link do anúncio" type="url" />
        <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20" /></label>
        <ActionSubmitButton pendingLabel="A adicionar à coleção…" className="min-h-11 rounded-xl bg-emerald-950 px-4 text-sm font-black text-white sm:col-span-2">Adicionar à coleção</ActionSubmitButton>
      </form>
    </details>
  </div>;
}

type InputProps = { name: string; label: string; type?: string; step?: string; required?: boolean; placeholder?: string; defaultValue?: string | number };

function Input({ name, label, ...props }: InputProps) {
  return <label><span className="field-label">{label}</span><input name={name} className="field-input" {...props} /></label>;
}
