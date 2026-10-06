import Link from "next/link";
import { PlatformArtwork } from "@/components/artwork";
import { WishlistArtwork } from "@/components/wishlist-artwork";
import { addWishlistGame } from "@/lib/library-actions";
import { getStats, getWantlist } from "@/lib/data/collection-service";
import { displayPlatform, platformReleaseYear, platformSlug, sortPlatformsByRelease } from "@/lib/data/platforms";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { formatEuro, gameCountLabel } from "@/lib/format";
import { isOrderedWishlistTarget } from "@/lib/wishlist-acquisition.logic";
import { resolveWishlistArtwork } from "@/lib/wishlist-artwork";

export const metadata = { title: "Wishlist" };

export default async function WantPage() {
  const [targets, stats] = await Promise.all([getWantlist(), getStats()]);
  const ordered = targets
    .filter(isOrderedWishlistTarget)
    .sort((a, b) => (b.acquisition?.orderedAt ?? "").localeCompare(a.acquisition?.orderedAt ?? ""));
  const active = targets.filter((target) =>
    !isOrderedWishlistTarget(target) &&
    target.planState !== "inactive" &&
    target.matchState !== "acquired"
  );
  const names = [...new Set([...stats.platforms.map((item) => item.platform), ...active.map((target) => target.platform)])];
  const groups = sortPlatformsByRelease(names.map((platform) => ({
    platform,
    count: active.filter((target) => target.platform === platform).length,
  })).filter((item) => item.count > 0));

  return <div className="space-y-6 pb-8">
    <header className="collection-hero wishlist-hero">
      <p className="eyebrow text-rose-700">WISHLIST</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950">{gameCountLabel(active.length)} por comprar</h1>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        {ordered.length
          ? String(ordered.length) + (ordered.length === 1 ? " jogo comprado está" : " jogos comprados estão") + " a caminho."
          : "Escolhe uma consola."}
      </p>
    </header>

    {ordered.length > 0 && <section className="collection-panel p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow text-amber-700">A CAMINHO</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            {ordered.length === 1 ? "1 encomenda por receber" : String(ordered.length) + " encomendas por receber"}
          </h2>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">Não comprar novamente</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ordered.map((target) => {
          const params = new URLSearchParams({ platform: target.platform, title: target.title, from: "/want" });
          return <Link
            key={target.targetId + target.title}
            href={"/wish/" + encodeURIComponent(target.targetId) + "?" + params.toString()}
            className="flex min-w-0 gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 hover:bg-amber-100/70"
          >
            <WishlistArtwork title={target.title} platform={target.platform} artworkSrc={resolveWishlistArtwork(target)} className="h-24 w-20 shrink-0" />
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-black text-slate-950">{target.title}</strong>
              <span className="block truncate text-xs font-semibold text-slate-500">{displayPlatform(target.platform)}</span>
              <span className="mt-2 block text-[11px] font-bold text-amber-800">
                {[target.purchase?.date, target.purchase?.source].filter(Boolean).join(" · ") || "Compra registada"}
              </span>
              {target.purchase?.totalPaidEur != null && <span className="mt-1 block text-xs font-black text-slate-800">{formatEuro(target.purchase.totalPaidEur)}</span>}
            </span>
          </Link>;
        })}
      </div>
    </section>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => <Link key={group.platform} href={"/platform/" + platformSlug(group.platform) + "?tab=wishlist"} className="console-card group">
        <span className="h-24 w-28 shrink-0 overflow-hidden rounded-2xl bg-white/65"><PlatformArtwork platform={group.platform} className="h-full w-full" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <strong className="truncate text-base font-black text-slate-950">{displayPlatform(group.platform)}</strong>
            <span className="text-xs font-black text-slate-400">{platformReleaseYear(group.platform) < 9990 ? platformReleaseYear(group.platform) : "—"}</span>
          </span>
          <p className="mt-2 text-xs font-semibold text-slate-500">{gameCountLabel(group.count)} em falta</p>
        </span>
      </Link>)}
    </section>

    <details className="collection-panel p-4">
      <summary className="cursor-pointer text-sm font-black text-slate-900">+ Adicionar à wishlist</summary>
      <form action={addWishlistGame} className="mt-4 grid gap-2 sm:grid-cols-2">
        <Input name="title" label="Jogo" required />
        <Input name="platform" label="Consola" required placeholder="Nintendo DS" />
        <label><span className="field-label">Prioridade</span><select name="priority" defaultValue="Média" className="field-input"><option>Alta</option><option>Média</option><option>Baixa</option><option>Grail</option></select></label>
        <Input name="priceCeilingEur" label="Referência manual (€)" type="number" step="0.01" />
        <Input name="targetVersion" label="Versão alvo" placeholder="PAL · CIB" />
        <Input name="reason" label="Porque quero" />
        <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20" /></label>
        <ActionSubmitButton pendingLabel="A adicionar à wishlist…" className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-black text-white sm:col-span-2">Adicionar à wishlist</ActionSubmitButton>
      </form>
    </details>
  </div>;
}

type InputProps = { name: string; label: string; type?: string; step?: string; required?: boolean; placeholder?: string };

function Input({ name, label, ...props }: InputProps) {
  return <label><span className="field-label">{label}</span><input name={name} className="field-input" {...props} /></label>;
}
