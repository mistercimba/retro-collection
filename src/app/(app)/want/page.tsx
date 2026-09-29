import Link from "next/link";
import { PlatformArtwork } from "@/components/artwork";
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

  return <div className="space-y-6 pb-8">
    <header className="collection-hero wishlist-hero"><p className="eyebrow text-rose-700">WISHLIST</p><h1 className="mt-1 text-3xl font-black text-slate-950">{active.length} jogos em falta</h1><p className="mt-1 text-sm font-semibold text-slate-500">Escolhe uma consola.</p></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => <Link key={group.platform} href={"/platform/" + platformSlug(group.platform) + "?tab=wishlist"} className="console-card group">
        <span className="h-24 w-28 shrink-0 overflow-hidden rounded-2xl bg-white/65"><PlatformArtwork platform={group.platform} className="h-full w-full" /></span>
        <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><strong className="truncate text-base font-black text-slate-950">{displayPlatform(group.platform)}</strong><span className="text-xs font-black text-slate-400">{platformReleaseYear(group.platform) < 9990 ? platformReleaseYear(group.platform) : "—"}</span></span><p className="mt-2 text-xs font-semibold text-slate-500">{group.count} jogos em falta</p></span>
      </Link>)}
    </section>

    <details className="collection-panel p-4">
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
