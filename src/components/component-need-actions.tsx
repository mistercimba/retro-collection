import { ActionSubmitButton } from "@/components/action-submit-button";
import { updateComponentNeedStatus } from "@/lib/library-actions";
import type { ComponentNeedEntry } from "@/lib/component-needs.logic";

export function ComponentNeedActions({ need }: { need: ComponentNeedEntry }) {
  const actions = need.status === "missing"
    ? [
        { status: "found", label: "Encontrei" },
        { status: "purchased", label: "Comprei" },
        { status: "received", label: "Recebi" },
      ]
    : need.status === "found"
      ? [
          { status: "missing", label: "Voltar a Em falta" },
          { status: "purchased", label: "Comprei" },
          { status: "received", label: "Recebi" },
        ]
      : need.status === "purchased"
        ? [
            { status: "missing", label: "Voltar a Em falta" },
            { status: "received", label: "Recebi" },
          ]
        : [];

  return <div className="flex flex-wrap gap-2">
    {actions.map((action) => <form key={action.status} action={updateComponentNeedStatus}>
      <NeedFields need={need} />
      <input type="hidden" name="status" value={action.status} />
      <ActionSubmitButton
        pendingLabel="A atualizar…"
        className={action.status === "received"
          ? "min-h-9 rounded-lg bg-emerald-900 px-3 text-xs font-black text-white"
          : action.status === "missing"
            ? "min-h-9 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-800"
            : "min-h-9 rounded-lg border border-[#d8d2c5] bg-white px-3 text-xs font-black text-slate-700"}
      >
        {action.label}
      </ActionSubmitButton>
    </form>)}

    {need.componentKey === "custom" && <form action={updateComponentNeedStatus}>
      <NeedFields need={need} />
      <input type="hidden" name="status" value="closed" />
      <ActionSubmitButton pendingLabel="A fechar…" className="min-h-9 rounded-lg px-2 text-[11px] font-black text-slate-400 underline underline-offset-2">
        Fechar
      </ActionSubmitButton>
    </form>}
  </div>;
}

export function ComponentNeedStatusBadge({ status }: { status: ComponentNeedEntry["status"] }) {
  const value = status === "found"
    ? { label: "Encontrado", className: "bg-sky-100 text-sky-800" }
    : status === "purchased"
      ? { label: "Comprado", className: "bg-amber-100 text-amber-900" }
      : { label: "Em falta", className: "bg-rose-100 text-rose-800" };

  return <span className={"rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide " + value.className}>{value.label}</span>;
}

function NeedFields({ need }: { need: ComponentNeedEntry }) {
  return <>
    <input type="hidden" name="collectionId" value={need.collectionId} />
    <input type="hidden" name="needId" value={need.id} />
    <input type="hidden" name="componentKey" value={need.componentKey} />
    <input type="hidden" name="label" value={need.label} />
  </>;
}
