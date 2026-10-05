import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { createCollectionList } from "@/lib/collection-list-actions";
import { collectionListProgressPercent } from "@/lib/collection-lists.logic";
import { getResolvedCollectionLists } from "@/lib/collection-lists";

export const metadata = { title: "Listas e objetivos" };

export default async function ListsPage() {
  const lists = await getResolvedCollectionLists();
  return <div className="space-y-6 pb-8">
    <header className="collection-hero">
      <p className="eyebrow">LISTAS E OBJETIVOS</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950">O que queres completar.</h1>
      <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">Cria listas tuas e acompanha quantos alvos já estão na Collection. Sem achievements, sem franchises hardcoded.</p>
    </header>

    {lists.length ? <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {lists.map(({ list, ownedCount, totalCount }) => {
        const percent = collectionListProgressPercent(ownedCount, totalCount);
        return <Link key={list.id} href={`/lists/${encodeURIComponent(list.id)}`} className="collection-panel block p-4 transition hover:border-[#9aac9e]">
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5eadf] text-[#17382e]"><ListChecks className="h-5 w-5"/></span>
            <span className="text-sm font-black text-[#315b47]">{ownedCount}/{totalCount}</span>
          </div>
          <h2 className="mt-3 text-base font-black text-slate-950">{list.name}</h2>
          <p className="mt-1 min-h-8 text-xs font-semibold text-slate-500">{list.description || "Lista personalizada da coleção."}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e9e5da]" aria-label={`${ownedCount} de ${totalCount} jogos na coleção`}>
            <div className="h-full rounded-full bg-[#6d8a78]" style={{ width: `${percent}%` }}/>
          </div>
          <p className="mt-2 text-[11px] font-bold text-slate-400">{totalCount ? `${percent}% completo` : "Ainda sem alvos"}</p>
        </Link>;
      })}
    </section> : <section className="collection-panel p-6 text-center">
      <ListChecks className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 font-black text-slate-800">Ainda não tens listas.</p>
      <p className="mt-1 text-sm text-slate-500">Podes criar uma série, um set ou qualquer seleção que faça sentido para a tua coleção.</p>
    </section>}

    <section className="collection-panel p-4">
      <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-[#315b47]"/><h2 className="text-sm font-black text-slate-950">Nova lista</h2></div>
      <form action={createCollectionList} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
        <label><span className="field-label">Nome</span><input name="name" required className="field-input" placeholder="Professor Layton"/></label>
        <label><span className="field-label">Descrição</span><input name="description" className="field-input" placeholder="Jogos principais PAL que quero completar"/></label>
        <ActionSubmitButton pendingLabel="A criar…" className="min-h-11 self-end rounded-xl bg-[#17382e] px-4 text-sm font-black text-white">Criar lista</ActionSubmitButton>
      </form>
    </section>
  </div>;
}
