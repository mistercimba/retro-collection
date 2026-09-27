import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleCheck, Compass, ExternalLink, Heart, Search, Target } from "lucide-react";
import { MarketSearchLinks } from "@/components/market-search-links";
import { getWantlist } from "@/lib/data/collection-service";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";

export const metadata = { title: "Wants list" };

const priorityStyle: Record<string, string> = {
  Alta: "want-priority-high",
  Média: "want-priority-medium",
  Baixa: "want-priority-low",
  Grail: "want-priority-grail",
};

export default async function WantPage() {
  const targets = await getWantlist();
  const active = targets.filter((target) => target.planState === "active");
  const acquired = active.filter((target) => target.matchState === "acquired");
  const unresolved = targets.filter((target) => target.planState !== "inactive" && target.matchState !== "acquired");
  const inactive = targets.filter((target) => target.planState === "inactive");
  const priorityCounts = ["Alta", "Média", "Baixa", "Grail"].map((priority) => ({
    priority,
    count: unresolved.filter((target) => target.priority.toLowerCase() === priority.toLowerCase()).length,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8 sm:space-y-10">
      <section className="want-hero">
        <div className="relative z-10 max-w-3xl">
          <span className="archive-eyebrow"><Heart className="h-3.5 w-3.5" /> CAÇADA EM CURSO</span>
          <h1 className="mt-5 text-4xl font-black tracking-[-.055em] text-white sm:text-6xl">A próxima peça começa aqui.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:text-base sm:leading-7">Uma lista viva baseada nos teus PLANs. Quando um jogo entra na coleção, sai automaticamente dos alvos em falta.</p>
        </div>
        <div className="want-summary">
          <div><strong>{active.length}</strong><span>alvos ativos</span></div>
          <div><strong>{acquired.length}</strong><span>já encontrados</span></div>
          <div className="want-priority-summary">{priorityCounts.map((item) => <span key={item.priority}><i className={priorityStyle[item.priority]} />{item.count} {item.priority}</span>)}</div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="section-kicker">PRIORIDADES DA SHEET</p><h2 className="section-title">Alvos em falta</h2></div>
            <span className="text-xs font-bold text-slate-500">{unresolved.length} por procurar</span>
          </div>
          {unresolved.length ? (
            <div className="space-y-3">
              {unresolved.map((target) => (
                <article key={`${target.platform}:${target.title}`} className="want-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`want-priority ${priorityStyle[target.priority] ?? "want-priority-low"}`}><Target className="h-3.5 w-3.5" />{target.priority || "Sem prioridade"}</span>
                    <span className="want-platform">{displayPlatform(target.platform)}</span>
                    <span className="want-platform">{target.status || "Estado por confirmar"}</span>
                    {target.matchState === "ambiguous" && <span className="want-ambiguous-badge">Ambíguo</span>}
                    {target.targetId && target.targetId !== "NOVO" && <span className="want-id">{target.targetId}</span>}
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{target.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{target.reason}</p></div>
                    <span className="want-title-arrow"><ArrowUpRight className="h-4 w-4" /></span>
                  </div>
                  {target.matchReason === "unknown-plan-state" && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">O estado deste alvo não é reconhecido. Mantive-o visível e não o marquei como adquirido.</p>}
                  {target.possibleMatch && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{target.matchReason === "owned-variant-does-not-match-target" ? "Existe uma cópia com este título, mas a variante registada não cumpre o alvo:" : target.matchReason === "variant-data-incomplete" ? "Encontrei o título, mas faltam dados da cópia para confirmar a variante:" : "Possível correspondência na coleção:"} <Link className="font-bold underline" href={`/game/${encodeURIComponent(target.possibleMatch.collectionId)}`}>{target.possibleMatch.title} ({target.possibleMatch.region || "região desconhecida"} · {target.possibleMatch.edition || "edição desconhecida"})</Link>. Mantive o alvo por procurar.</p>}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="want-detail"><span>Versão para procurar</span><strong>{target.targetVersion || "Confirmar edição PAL"}</strong></div>
                    <div className="want-detail"><span>Teto de compra validado</span><strong>{target.priceCeilingEur === null ? "Ainda não definido" : formatEuro(target.priceCeilingEur)}</strong></div>
                  </div>
                  {target.notes && <p className="mt-3 text-xs leading-5 text-slate-500">{target.notes}</p>}
                  <div className="mt-4 border-t border-slate-100 pt-4"><p className="mb-2 text-[10px] font-black uppercase tracking-[.13em] text-slate-400">Pesquisar este jogo</p><MarketSearchLinks title={target.title} platform={target.platform} compact /></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-wants"><CircleCheck className="mx-auto h-8 w-8 text-emerald-700" /><h3 className="mt-3 font-black text-slate-950">{active.length ? "Todos os alvos ativos foram encontrados." : "Não há alvos ativos neste momento."}</h3><p className="mt-1 text-sm text-slate-500">Quando atualizares os PLANs, a lista reflete o estado na próxima sincronização.</p></div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="want-side-card">
            <span className="panel-icon"><Compass className="h-5 w-5" /></span>
            <h2 className="mt-4 text-lg font-black text-slate-950">Compra com contexto.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">O preço no anúncio só faz sentido comparado com a variante e o estado que procuras.</p>
            <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-600">
              <li>• Confirma sempre edição, região e completude.</li>
              <li>• Compara anúncios vendidos, não só os ativos.</li>
              <li>• Os tetos antigos só contam depois de revalidados.</li>
            </ul>
          </div>
          <div className="want-side-card want-source-card">
            <div className="flex items-center gap-2"><Search className="h-4 w-4 text-[#315b47]" /><h2 className="text-sm font-black text-slate-900">Como esta lista se atualiza</h2></div>
            <p className="mt-2 text-xs leading-5 text-slate-600">A lista respeita o estado do PLAN e só confirma um alvo quando título, plataforma e variante registada são compatíveis. Se faltar informação, mantém-no visível como ambíguo.</p>
            <Link href="/collection" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#315b47]">Abrir coleção <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </aside>
      </section>

      {acquired.length > 0 && <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><div className="flex items-center gap-2 text-sm font-black text-emerald-950"><CircleCheck className="h-4 w-4" /> {acquired.length} alvo{acquired.length === 1 ? "" : "s"} já encontrado{acquired.length === 1 ? "" : "s"}</div><p className="mt-1 text-xs leading-5 text-emerald-900/75">{acquired.slice(0, 5).map((entry) => entry.title).join(" · ")}{acquired.length > 5 ? " · …" : ""}</p></section>}
      {inactive.length > 0 && <details className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-bold text-slate-700">{inactive.length} alvo{inactive.length === 1 ? "" : "s"} inativo{inactive.length === 1 ? "" : "s"} segundo o PLAN</summary><ul className="mt-3 space-y-2 text-sm text-slate-600">{inactive.map((target) => <li key={`${target.platform}:${target.title}`} className="flex flex-wrap justify-between gap-2"><span>{target.title} · {displayPlatform(target.platform)}</span><span className="text-xs font-semibold text-slate-400">{target.status}</span></li>)}</ul></details>}
      <div className="flex justify-center"><a href="https://www.pricecharting.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900">Consultar PriceCharting <ExternalLink className="h-3 w-3" /></a></div>
    </div>
  );
}
