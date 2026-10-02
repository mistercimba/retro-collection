import Link from "next/link";
import { CopyPlus, Images } from "lucide-react";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { addCollectionGame } from "@/lib/library-actions";
import type { CollectionGame } from "@/lib/data/types";
import { formatEuro } from "@/lib/format";

function paidValue(copy: CollectionGame): number | null {
  return copy.purchase?.totalPaidEur ?? copy.allocatedCostEur ?? null;
}

function estimatedValue(copy: CollectionGame): number | null {
  return copy.latestValuation?.valueEur ?? copy.marketValueEur ?? null;
}

function statusLabel(copy: CollectionGame): string {
  if (copy.keepStatus === "Sell") return "Para vender";
  if (copy.keepStatus === "Sold") return "Vendido";
  return "Na coleção";
}

function detailHref(collectionId: string, returnTo: string): string {
  return `/game/${encodeURIComponent(collectionId)}?from=${encodeURIComponent(returnTo)}`;
}

export function OwnedCopyGroup({
  current,
  copies,
  returnTo,
}: {
  current: CollectionGame;
  copies: CollectionGame[];
  returnTo: string;
}) {
  return <section className="collection-panel p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-black text-slate-950">As minhas cópias</h2>
        <p className="mt-1 text-xs text-slate-500">
          Cada cópia mantém condição, compra, valor e fotos independentes.
        </p>
      </div>
      <span className="rounded-full bg-[#e5eadf] px-2.5 py-1 text-[11px] font-black text-[#315b47]">
        {copies.length} {copies.length === 1 ? "cópia atual" : "cópias atuais"}
      </span>
    </div>

    {copies.length > 1 ? <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {copies.map((copy, index) => {
        const selected = copy.collectionId === current.collectionId;
        const body = <div className={"h-full rounded-2xl border p-3 transition " + (selected ? "border-[#6d8a78] bg-[#edf1e8]" : "border-[#e2ddd2] bg-[#faf8f2] hover:border-[#9aac9e]")}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#466558]">
                Cópia {index + 1}{selected ? " · Esta cópia" : ""}
              </p>
              <p className="mt-0.5 truncate text-xs font-bold text-slate-500">{copy.collectionId}</p>
            </div>
            <span className="shrink-0 text-[10px] font-black text-slate-500">{statusLabel(copy)}</span>
          </div>
          <p className="mt-2 text-sm font-black text-slate-900">
            {[copy.region, copy.edition].filter(Boolean).join(" · ") || "Região / edição por definir"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {[copy.overallStatus, copy.conditionGrade].filter(Boolean).join(" · ") || "Estado por definir"}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <CopyFact label="Pago" value={formatEuro(paidValue(copy))}/>
            <CopyFact label="Valor" value={formatEuro(estimatedValue(copy))}/>
            <CopyFact label="Fotos" value={String(copy.photos?.length ?? 0)}/>
          </div>
        </div>;
        return selected
          ? <article key={copy.collectionId} aria-current="true">{body}</article>
          : <Link key={copy.collectionId} href={detailHref(copy.collectionId, returnTo)} className="block">{body}</Link>;
      })}
    </div> : <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#e2ddd2] bg-[#faf8f2] p-3">
      <Images className="h-5 w-5 shrink-0 text-[#466558]" />
      <p className="text-xs font-semibold text-slate-600">Só existe uma cópia física atual deste jogo.</p>
    </div>}

    <details className="mt-4 rounded-2xl border border-[#d8d2c5] bg-white/70 p-4">
      <summary className="cursor-pointer text-sm font-black text-[#17382e]">
        <span className="inline-flex items-center gap-2"><CopyPlus className="h-4 w-4"/>Adicionar outra cópia</span>
      </summary>
      <p className="mt-2 text-xs text-slate-500">
        O título e a consola ficam iguais. Todos os dados físicos e de compra começam separados.
      </p>
      <form action={addCollectionGame} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="title" value={current.title}/>
        <input type="hidden" name="platform" value={current.platform}/>
        <Field name="overallStatus" label="Completude" placeholder="CIB / Loose / Sealed"/>
        <Field name="conditionGrade" label="Condição" placeholder="Excellent / Good…"/>
        <Field name="region" label="Região" placeholder="PAL"/>
        <Field name="edition" label="Edição" placeholder="Standard"/>
        <Field name="paid" label="Preço pago (€)" type="number" step="0.01" min="0" inputMode="decimal"/>
        <Field name="source" label="Onde comprei" placeholder="Feira, Vinted, CeX…"/>
        <details className="rounded-xl border border-[#e2ddd2] bg-[#faf8f2] p-3 sm:col-span-2">
          <summary className="cursor-pointer text-xs font-black text-slate-700">Mais detalhes</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field name="language" label="Idioma"/>
            <Field name="purchaseDate" label="Data de compra" type="date"/>
            <Field name="seller" label="Vendedor"/>
            <Field name="listingUrl" label="Link do anúncio" type="url"/>
            <label className="sm:col-span-2">
              <span className="field-label">Notas da cópia</span>
              <textarea name="notes" className="field-input min-h-20"/>
            </label>
          </div>
        </details>
        <ActionSubmitButton pendingLabel="A adicionar…" className="min-h-11 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white sm:col-span-2">
          Adicionar nova cópia
        </ActionSubmitButton>
      </form>
    </details>
  </section>;
}

function CopyFact({ label, value }: { label: string; value: string }) {
  return <div>
    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-0.5 truncate font-bold text-slate-700">{value}</p>
  </div>;
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  step,
  min,
  inputMode,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  step?: string;
  min?: string;
  inputMode?: "decimal";
}) {
  return <label>
    <span className="field-label">{label}</span>
    <input name={name} type={type} placeholder={placeholder} step={step} min={min} inputMode={inputMode} className="field-input"/>
  </label>;
}
