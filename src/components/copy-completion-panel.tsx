import Link from "next/link";
import type { CollectionGame } from "@/lib/data/types";
import type { ComponentNeedEntry } from "@/lib/component-needs.logic";
import { componentLibraryValue, libraryComponentState } from "@/lib/component-needs.logic";
import { physicalCopyProfile } from "@/lib/physical-copy-profile.logic";
import { addMissingComponent, saveCopyComponents } from "@/lib/library-actions";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { ComponentNeedActions, ComponentNeedStatusBadge } from "@/components/component-need-actions";

export function CopyCompletionPanel({
  game,
  activeNeeds,
  history,
}: {
  game: CollectionGame;
  activeNeeds: ComponentNeedEntry[];
  history: ComponentNeedEntry[];
}) {
  const profile = physicalCopyProfile(game.platform);

  return <section className="collection-panel p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <p className="eyebrow text-amber-700">PARA COMPLETAR</p>
        <h2 className="mt-1 text-sm font-black text-slate-950">
          {activeNeeds.length === 0
            ? "Nenhuma peça confirmada em falta"
            : activeNeeds.length === 1
              ? "1 peça em falta nesta cópia"
              : String(activeNeeds.length) + " peças em falta nesta cópia"}
        </h2>
      </div>
      <Link href="/complete" className="text-xs font-black text-[#315b47]">Ver lista completa →</Link>
    </div>

    {activeNeeds.length > 0 && <div className="mt-3 grid gap-2">
      {activeNeeds.map((need) => <div key={need.id} className="rounded-xl border border-[#e2ddd2] bg-[#faf8f2] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong className="text-sm font-black text-slate-900">{need.label}</strong>
            {need.notes && <p className="mt-0.5 text-xs font-semibold text-slate-500">{need.notes}</p>}
          </div>
          <ComponentNeedStatusBadge status={need.status} />
        </div>
        <div className="mt-3"><ComponentNeedActions need={need} /></div>
      </div>)}
    </div>}

    <details className="mt-4 rounded-2xl border border-[#ded8cb] bg-white/70 p-4">
      <summary className="cursor-pointer text-sm font-black text-slate-900">Atualizar checklist física</summary>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{profile.note}</p>
      <form action={saveCopyComponents} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="collectionId" value={game.collectionId} />
        {profile.components.map((component) => <label key={component.key}>
          <span className="field-label">{component.label}</span>
          <select name={"component_" + component.key} defaultValue={libraryComponentState(componentLibraryValue(game, component.key))} className="field-input">
            <option value="yes">Tenho</option>
            <option value="no">Falta</option>
            <option value="unknown">Verificar depois</option>
          </select>
        </label>)}
        <p className="text-xs font-semibold leading-5 text-slate-500 sm:col-span-2">
          Marcar <strong>Falta</strong> cria a necessidade desta cópia. Marcar <strong>Tenho</strong> fecha a necessidade correspondente como recebida e recalcula a completude.
        </p>
        <ActionSubmitButton pendingLabel="A guardar checklist…" className="min-h-10 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white sm:col-span-2">
          Guardar checklist
        </ActionSubmitButton>
      </form>
    </details>

    <details className="mt-3 rounded-2xl border border-[#ded8cb] bg-white/70 p-4">
      <summary className="cursor-pointer text-sm font-black text-slate-900">+ Adicionar peça específica da edição</summary>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        Usa isto apenas para algo que sabes que pertence a esta cópia/edição: mapa, poster, disco 2, sleeve, insert, etc. A app não inventa extras.
      </p>
      <form action={addMissingComponent} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="collectionId" value={game.collectionId} />
        <label><span className="field-label">Peça em falta</span><input name="label" required className="field-input" placeholder="Ex.: Mapa" /></label>
        <label><span className="field-label">Nota</span><input name="notes" className="field-input" placeholder="Opcional" /></label>
        <ActionSubmitButton pendingLabel="A adicionar…" className="min-h-10 rounded-xl bg-amber-800 px-4 text-sm font-black text-white sm:col-span-2">
          Adicionar a Para completar
        </ActionSubmitButton>
      </form>
    </details>

    {history.length > 0 && <details className="mt-3 px-1">
      <summary className="cursor-pointer text-xs font-black text-slate-500">Histórico destas peças ({history.length})</summary>
      <div className="mt-2 space-y-1">
        {history.slice(0, 8).map((need) => <p key={need.id} className="text-xs font-semibold text-slate-500">
          {need.label} · {need.status === "received" ? "Recebido" : "Fechado"}
        </p>)}
      </div>
    </details>}
  </section>;
}
