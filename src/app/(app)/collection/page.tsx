import Link from "next/link";
import { PlatformArtwork } from "@/components/artwork";
import { addCollectionGame } from "@/lib/library-actions";
import { getStats } from "@/lib/data/collection-service";
import { displayPlatform, platformReleaseYear, sortPlatformsByRelease } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";

export const metadata = { title: "Coleção" };

export default async function CollectionPage() {
  const stats = await getStats();
  const platforms = sortPlatformsByRelease(stats.platforms);

  return <div className="space-y-6 pb-8">
    <header className="collection-hero"><p className="eyebrow">COLEÇÃO</p><h1 className="mt-1 text-3xl font-black text-slate-950">{stats.kept} jogos</h1><p className="mt-1 text-sm font-semibold text-slate-500">Escolhe uma consola.</p></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {platforms.map((item) => <Link key={item.platform} href={"/platform/" + item.slug} className="console-card group">
        <span className="h-24 w-28 shrink-0 overflow-hidden rounded-2xl bg-white/65"><PlatformArtwork platform={item.platform} className="h-full w-full" /></span>
        <span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="truncate text-base font-black">{displayPlatform(item.platform)}</strong><span className="text-xs font-black text-slate-400">{platformReleaseYear(item.platform) < 9990 ? platformReleaseYear(item.platform) : "—"}</span></span><span className="mt-2 flex gap-3 text-xs font-semibold text-slate-500"><span>{item.count} jogos</span><span>{formatEuro(item.marketValueEur)}</span></span></span>
      </Link>)}
    </section>

    <details className="collection-panel p-4">
      <summary className="cursor-pointer text-sm font-black text-slate-900">+ Adicionar jogo manualmente</summary>
      <form action={addCollectionGame} className="mt-4 grid gap-2 sm:grid-cols-2">
        <Input name="title" label="Jogo" required />
        <Input name="platform" label="Consola" required placeholder="Nintendo DS" />
        <Input name="edition" label="Edição" placeholder="Standard" />
        <Input name="region" label="Região" placeholder="PAL" />
        <Input name="language" label="Idioma" />
        <Input name="overallStatus" label="Completude" placeholder="CIB / Loose" />
        <Input name="conditionGrade" label="Condição" />
        <Input name="paid" label="Preço pago (€)" type="number" step="0.01" />
        <Input name="source" label="Onde comprei" placeholder="Feira, Vinted, CeX…" />
        <Input name="purchaseDate" label="Data de compra" type="date" />
        <Input name="seller" label="Vendedor" />
        <Input name="listingUrl" label="Link do anúncio" type="url" />
        <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20" /></label>
        <button className="min-h-11 rounded-xl bg-emerald-950 px-4 text-sm font-black text-white sm:col-span-2">Adicionar à coleção</button>
      </form>
    </details>
  </div>;
}

type InputProps = { name: string; label: string; type?: string; step?: string; required?: boolean; placeholder?: string; defaultValue?: string | number };

function Input({ name, label, ...props }: InputProps) {
  return <label><span className="field-label">{label}</span><input name={name} className="field-input" {...props} /></label>;
}
