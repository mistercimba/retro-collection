import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ComponentNeedActions, ComponentNeedStatusBadge } from "@/components/component-need-actions";
import { getComponentCompletionQueue } from "@/lib/data/collection-service";
import { displayPlatform, platformSlug, sortPlatformsByRelease } from "@/lib/data/platforms";

export const metadata = { title: "Para completar" };

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [query, queue] = await Promise.all([searchParams, getComponentCompletionQueue()]);
  const selectedPlatformSlug = typeof query.platform === "string" ? query.platform : "";
  const platforms = sortPlatformsByRelease(
    [...new Set(queue.active.map((need) => need.platform))].map((platform) => ({ platform })),
  );
  const active = selectedPlatformSlug
    ? queue.active.filter((need) => platformSlug(need.platform) === selectedPlatformSlug)
    : queue.active;
  const history = selectedPlatformSlug
    ? queue.history.filter((need) => platformSlug(need.platform) === selectedPlatformSlug)
    : queue.history;

  const groups = new Map<string, typeof active>();
  for (const need of active) {
    const current = groups.get(need.collectionId) ?? [];
    current.push(need);
    groups.set(need.collectionId, current);
  }

  return <div className="mx-auto max-w-5xl space-y-5 pb-10">
    <Link href="/collection" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-800">
      <ArrowLeft className="h-3.5 w-3.5" />Coleção
    </Link>

    <header className="collection-hero">
      <p className="eyebrow text-amber-700">PARA COMPLETAR</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950">
        {active.length === 0 ? "Nada confirmado em falta" : active.length === 1 ? "1 peça em falta" : String(active.length) + " peças em falta"}
      </h1>
      <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">
        Peças ligadas à cópia física concreta. Isto é separado da Wishlist de jogos.
      </p>
    </header>

    {platforms.length > 1 && <section className="collection-panel p-3">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/complete"
          className={!selectedPlatformSlug
            ? "rounded-full bg-[#17382e] px-3 py-1.5 text-xs font-black text-white"
            : "rounded-full border border-[#d8d2c5] bg-white px-3 py-1.5 text-xs font-black text-slate-600"}
        >
          Todas
        </Link>
        {platforms.map(({ platform }) => {
          const slug = platformSlug(platform);
          const selected = slug === selectedPlatformSlug;
          return <Link
            key={platform}
            href={"/complete?platform=" + encodeURIComponent(slug)}
            className={selected
              ? "rounded-full bg-[#17382e] px-3 py-1.5 text-xs font-black text-white"
              : "rounded-full border border-[#d8d2c5] bg-white px-3 py-1.5 text-xs font-black text-slate-600"}
          >
            {displayPlatform(platform)}
          </Link>;
        })}
      </div>
    </section>}

    {active.length === 0
      ? <section className="collection-panel p-5 text-sm font-semibold text-slate-500">
          {selectedPlatformSlug
            ? "Não há peças em falta nesta consola com o filtro atual."
            : "Quando uma cópia tiver uma peça que realmente queres procurar, aparece aqui."}
        </section>
      : <section className="grid gap-3">
          {[...groups.entries()].map(([collectionId, needs]) => {
            const first = needs[0];
            return <article key={collectionId} className="collection-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={"/game/" + encodeURIComponent(collectionId)} className="text-base font-black text-slate-950 hover:text-[#315b47]">
                    {first.title}
                  </Link>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {displayPlatform(first.platform)} · {first.edition || "Edição por definir"} · {collectionId}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                  {needs.length === 1 ? "1 peça" : String(needs.length) + " peças"}
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                {needs.map((need) => <div key={need.id} className="rounded-xl border border-[#e2ddd2] bg-[#faf8f2] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong className="text-sm font-black text-slate-900">{need.label}</strong>
                      {need.inferred && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">da checklist</span>}
                      {need.notes && <p className="mt-0.5 text-xs font-semibold text-slate-500">{need.notes}</p>}
                    </div>
                    <ComponentNeedStatusBadge status={need.status} />
                  </div>
                  <div className="mt-3"><ComponentNeedActions need={need} /></div>
                </div>)}
              </div>
            </article>;
          })}
        </section>}

    {history.length > 0 && <details className="collection-panel p-4">
      <summary className="cursor-pointer text-sm font-black text-slate-900">Histórico de peças concluídas ({history.length})</summary>
      <div className="mt-3 divide-y divide-[#ece7dd]">
        {history.slice(0, 30).map((need) => <div key={need.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <div>
            <p className="text-sm font-black text-slate-900">{need.label} · {need.title}</p>
            <p className="text-xs font-semibold text-slate-500">{need.platform ? displayPlatform(need.platform) + " · " : ""}{need.collectionId}</p>
          </div>
          <span className="text-xs font-black text-slate-500">{need.status === "received" ? "Recebido" : "Fechado"}</span>
        </div>)}
      </div>
    </details>}
  </div>;
}
