import Link from "next/link";
import { Check, ChevronLeft, Circle, Pencil, Plus, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { addCollectionListTarget, editCollectionList, removeCollectionList, removeCollectionListTarget } from "@/lib/collection-list-actions";
import { collectionListProgressPercent } from "@/lib/collection-lists.logic";
import { getResolvedCollectionList } from "@/lib/collection-lists";
import { getLibrary } from "@/lib/library-store";
import { displayPlatform } from "@/lib/data/platforms";

export default async function CollectionListDetailPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const [resolved, library] = await Promise.all([getResolvedCollectionList(listId), getLibrary()]);
  if (!resolved) notFound();
  const { list, targets, ownedCount, totalCount } = resolved;
  const percent = collectionListProgressPercent(ownedCount, totalCount);
  const platforms = [...new Set([...library.collection.map((game) => game.platform), ...library.wishlist.map((target) => target.platform)])]
    .filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-PT"));

  return <div className="space-y-6 pb-8">
    <header className="collection-hero">
      <Link href="/lists" className="inline-flex items-center gap-1 text-xs font-black text-[#315b47] hover:text-[#17382e]"><ChevronLeft className="h-4 w-4"/>Listas</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">OBJETIVO DE COLEÇÃO</p><h1 className="mt-1 text-3xl font-black text-slate-950">{list.name}</h1>{list.description && <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">{list.description}</p>}</div>
        <div className="text-right"><p className="text-3xl font-black text-slate-950">{ownedCount}/{totalCount}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">na Collection</p></div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e4dfd3]" aria-label={`${ownedCount} de ${totalCount} jogos na coleção`}>
        <div className="h-full rounded-full bg-[#6d8a78]" style={{ width: `${percent}%` }}/>
      </div>
    </header>

    <section className="collection-panel overflow-hidden">
      <div className="border-b border-[#ece7dd] p-4"><h2 className="text-sm font-black text-slate-950">Alvos</h2><p className="mt-1 text-xs font-semibold text-slate-500">O progresso usa apenas jogos com estado Collection e identidade exata de título + plataforma.</p></div>
      {targets.length ? <div className="divide-y divide-[#ece7dd]">
        {targets.map((target) => <article key={target.id} className="flex items-center gap-3 p-4">
          <span className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl " + (target.ownedGame ? "bg-[#e5eadf] text-[#315b47]" : "bg-[#f1eee6] text-slate-400")}>{target.ownedGame ? <Check className="h-4 w-4"/> : <Circle className="h-4 w-4"/>}</span>
          <div className="min-w-0 flex-1">
            {target.ownedGame ? <Link href={`/game/${encodeURIComponent(target.ownedGame.collectionId)}`} className="block truncate text-sm font-black text-slate-950 hover:text-[#315b47]">{target.title}</Link> : <p className="truncate text-sm font-black text-slate-950">{target.title}</p>}
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{displayPlatform(target.platform)} · {target.ownedGame ? "Na coleção" : "Em falta"}</p>
          </div>
          <form action={removeCollectionListTarget}>
            <input type="hidden" name="listId" value={list.id}/><input type="hidden" name="targetId" value={target.id}/>
            <ActionSubmitButton pendingLabel="…" className="h-9 w-9 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"><span className="sr-only">Remover {target.title}</span><Trash2 className="h-4 w-4"/></ActionSubmitButton>
          </form>
        </article>)}
      </div> : <p className="p-5 text-sm font-semibold text-slate-500">Adiciona os jogos que fazem parte deste objetivo.</p>}
    </section>

    <section className="collection-panel p-4">
      <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-[#315b47]"/><h2 className="text-sm font-black text-slate-950">Adicionar alvo</h2></div>
      <form action={addCollectionListTarget} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
        <input type="hidden" name="listId" value={list.id}/>
        <label><span className="field-label">Jogo</span><input name="title" required className="field-input" placeholder="Professor Layton e a Caixa de Pandora"/></label>
        <label><span className="field-label">Plataforma</span><input name="platform" required list="collection-list-platforms" className="field-input" placeholder="Nintendo DS"/><datalist id="collection-list-platforms">{platforms.map((platform) => <option key={platform} value={platform}/>)}</datalist></label>
        <ActionSubmitButton pendingLabel="A adicionar…" className="min-h-11 self-end rounded-xl bg-[#17382e] px-4 text-sm font-black text-white">Adicionar</ActionSubmitButton>
      </form>
      <p className="mt-2 text-[11px] font-semibold text-slate-400">Um título/plataforma já existente na lista não é duplicado.</p>
    </section>

    <details className="collection-panel p-4">
      <summary className="cursor-pointer text-sm font-black text-[#17382e]"><span className="inline-flex items-center gap-2"><Pencil className="h-4 w-4"/>Editar lista</span></summary>
      <form action={editCollectionList} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="listId" value={list.id}/>
        <label><span className="field-label">Nome</span><input name="name" required defaultValue={list.name} className="field-input"/></label>
        <label><span className="field-label">Descrição</span><input name="description" defaultValue={list.description} className="field-input"/></label>
        <ActionSubmitButton pendingLabel="A guardar…" className="min-h-11 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white sm:col-span-2">Guardar alterações</ActionSubmitButton>
      </form>
      <div className="mt-5 border-t border-[#ece7dd] pt-4">
        <form action={removeCollectionList}><input type="hidden" name="listId" value={list.id}/><ActionSubmitButton pendingLabel="A eliminar…" className="min-h-10 rounded-xl border border-rose-200 px-4 text-sm font-black text-rose-700 hover:bg-rose-50">Eliminar lista</ActionSubmitButton></form>
        <p className="mt-2 text-[11px] text-slate-400">Eliminar a lista não altera nem remove jogos da Collection.</p>
      </div>
    </details>
  </div>;
}
