import Link from "next/link";
import { addWishlistGame } from "@/lib/library-actions";
import { getStats, getWantlist } from "@/lib/data/collection-service";
import { displayPlatform, platformReleaseYear, platformSlug, sortPlatformsByRelease } from "@/lib/data/platforms";

export const metadata = { title: "Wishlist" };

export default async function WantPage() {
  const [targets, stats] = await Promise.all([getWantlist(), getStats()]);
  const active = targets.filter((target) => target.planState !== "inactive" && target.matchState !== "acquired");
  const names = [...new Set([...stats.platforms.map((item) => item.platform), ...active.map((target) => target.platform)])];
  const groups = sortPlatformsByRelease(names.map((platform) => ({
    platform,
    count: active.filter((target) => target.platform === platform).length,
  })).filter((item) => item.count > 0));

  return <div className="space-y-5 pb-8">
    <header><p className="text-xs font-black uppercase tracking-[.14em] text-rose-700">Wishlist</p><h1 className="mt-1 text-2xl font-black text-slate-950">{active.length} jogos em falta</h1><p className="mt-1 text-sm text-slate-500">Escolhe uma consola.</p></header>
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => <Link key={group.platform} href={"/platform/" + platformSlug(group.platform) + "?tab=wishlist"} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-rose-300">
        <div className="flex items-baseline justify-between gap-2"><strong className="text-sm font-black text-slate-950">{displayPlatform(group.platform)}</strong><span className="text-[11px] text-slate-400">{platformReleaseYear(group.platform) < 9990 ? platformReleaseYear(group.platform) : "—"}</span></div>
        <p className="mt-2 text-xs text-slate-500">{group.count} alvos</p>
      </Link>)}
    </section>

    <details className="rounded-2xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-black text-slate-900">+ Adicionar à wishlist</summary>
      <form action={addWishlistGame} className="mt-4 grid gap-2 sm:grid-cols-2">
        <Input name="title" label="Jogo" required />
        <Input name="platform" label="Consola" required placeholder="Nintendo DS" />
        <label><span className="field-label">Prioridade</span><select name="priority" defaultValue="Média" className="field-input"><option>Alta</option><option>Média</option><option>Baixa</option><option>Grail</option></select></label>
        <Input name="priceCeilingEur" label="Máximo que pago (€)" type="number" step="0.01" />
        <Input name="targetVersion" label="Versão alvo" placeholder="PAL · CIB" />
        <Input name="reason" label="Porque quero" />
        <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20" /></label>
        <button className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-black text-white sm:col-span-2">Adicionar à wishlist</button>
      </form>
    </details>
  </div>;
}

type InputProps = { name: string; label: string; type?: string; step?: string; required?: boolean; placeholder?: string };

function Input({ name, label, ...props }: InputProps) {
  return <label><span className="field-label">{label}</span><input name={name} className="field-input" {...props} /></label>;
}
