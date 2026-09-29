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

  return <div className="space-y-5 pb-8">
    <header><p className="text-xs font-black uppercase tracking-[.14em] text-emerald-800">Coleção</p><h1 className="mt-1 text-2xl font-black text-slate-950">{stats.kept} jogos</h1><p className="mt-1 text-sm text-slate-500">Escolhe uma consola.</p></header>
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {platforms.map((item) => <Link key={item.platform} href={"/platform/" + item.slug} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:border-emerald-300">
        <span className="h-14 w-14 overflow-hidden rounded-xl bg-slate-50"><PlatformArtwork platform={item.platform} className="h-full w-full" /></span>
        <span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="truncate text-sm font-black">{displayPlatform(item.platform)}</strong><span className="text-[11px] text-slate-400">{platformReleaseYear(item.platform) < 9990 ? platformReleaseYear(item.platform) : "—"}</span></span><span className="mt-1 flex gap-3 text-xs text-slate-500"><span>{item.count} jogos</span><span>{formatEuro(item.marketValueEur)}</span></span></span>
      </Link>)}
    </section>

    <details className="rounded-2xl border border-slate-200 bg-white p-4">
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
        <Input name="acquiredDate" label="Data de compra" type="date" />
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
