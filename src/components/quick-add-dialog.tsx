"use client";

import { Plus, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { addCollectionGame } from "@/lib/library-actions";

export function QuickAddDialog({
  platforms,
  trigger,
}: {
  platforms: string[];
  trigger: "sidebar" | "mobile";
}) {
  const [open, setOpen] = useState(false);
  const platformListId = useId();
  const completenessListId = useId();
  const conditionListId = useId();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => titleRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const triggerButton = trigger === "sidebar"
    ? <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d9f36a] px-3 text-sm font-black text-[#183027] shadow-sm transition hover:bg-[#e4fa87]">
        <Plus className="h-4 w-4" /> Adicionar jogo
      </button>
    : <button type="button" onClick={() => setOpen(true)} className="mobile-nav-link text-[#17382e]" aria-label="Adicionar jogo à coleção">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#d9f36a] text-[#17382e] shadow-md"><Plus className="h-5 w-5" /></span>
        <span>Adicionar</span>
      </button>;

  const modal = open && typeof document !== "undefined"
    ? createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
      >
        <section role="dialog" aria-modal="true" aria-labelledby="quick-add-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#f7f3ea] shadow-2xl sm:max-w-2xl sm:rounded-3xl">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#ded8cb] bg-[#f7f3ea]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
            <div>
              <p className="eyebrow">QUICK ADD</p>
              <h2 id="quick-add-title" className="mt-1 text-xl font-black text-slate-950">Adicionar à coleção</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">O essencial primeiro. Os detalhes podem ficar para depois.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ded8cb] bg-white text-slate-500 hover:text-slate-950"><X className="h-4 w-4" /></button>
          </div>

          <form action={addCollectionGame} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <label className="sm:col-span-2">
              <span className="field-label">Jogo</span>
              <input ref={titleRef} name="title" required autoComplete="off" className="field-input" placeholder="Ex.: Professor Layton and the Lost Future" />
            </label>

            <label>
              <span className="field-label">Consola</span>
              <input name="platform" required list={platformListId} autoComplete="off" className="field-input" placeholder="Nintendo DS" />
              <datalist id={platformListId}>{platforms.map((platform) => <option key={platform} value={platform} />)}</datalist>
            </label>

            <label>
              <span className="field-label">Preço pago (€)</span>
              <input name="paid" type="number" min="0" step="0.01" inputMode="decimal" className="field-input" placeholder="Opcional" />
            </label>

            <label>
              <span className="field-label">Completude</span>
              <input name="overallStatus" list={completenessListId} autoComplete="off" className="field-input" placeholder="CIB / Loose / Sealed" />
              <datalist id={completenessListId}><option value="CIB" /><option value="Loose" /><option value="Sealed" /></datalist>
            </label>

            <label>
              <span className="field-label">Condição</span>
              <input name="conditionGrade" list={conditionListId} autoComplete="off" className="field-input" placeholder="Excellent / Good…" />
              <datalist id={conditionListId}><option value="Mint" /><option value="Near Mint" /><option value="Excellent" /><option value="Good" /><option value="Fair" /><option value="Poor" /></datalist>
            </label>

            <details className="rounded-2xl border border-[#ded8cb] bg-white/75 p-4 sm:col-span-2">
              <summary className="cursor-pointer text-sm font-black text-slate-800">Mais detalhes</summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field name="region" label="Região" placeholder="PAL" />
                <Field name="edition" label="Edição" placeholder="Standard" />
                <Field name="language" label="Idioma" />
                <Field name="source" label="Onde comprei" placeholder="Feira, Vinted, CeX…" />
                <Field name="purchaseDate" label="Data de compra" type="date" />
                <Field name="seller" label="Vendedor" />
                <label className="sm:col-span-2"><span className="field-label">Link do anúncio</span><input name="listingUrl" type="url" className="field-input" /></label>
                <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20" /></label>
              </div>
            </details>

            <div className="flex gap-2 sm:col-span-2 sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 flex-1 rounded-xl border border-[#d7d2c6] bg-white px-4 text-sm font-black text-slate-600 sm:flex-none">Cancelar</button>
              <ActionSubmitButton pendingLabel="A adicionar…" className="min-h-11 flex-[2] rounded-xl bg-[#17382e] px-5 text-sm font-black text-white sm:flex-none">Adicionar à coleção</ActionSubmitButton>
            </div>
          </form>
        </section>
      </div>,
      document.body,
    )
    : null;

  return <>{triggerButton}{modal}</>;
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return <label><span className="field-label">{label}</span><input name={name} type={type} placeholder={placeholder} className="field-input" /></label>;
}
