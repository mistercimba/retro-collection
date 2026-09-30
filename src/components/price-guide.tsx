import { ExternalLink } from "lucide-react";
import type { PriceGuide } from "@/lib/pricecharting-catalog";
import { formatEuro } from "@/lib/format";

export function PriceGuidePanel({ guide, cexCashEur = null, maxPayEur = null }: { guide: PriceGuide; cexCashEur?: number | null; maxPayEur?: number | null }) {
  const entries = [
    { label: "Loose", value: guide.looseEur },
    { label: "CIB", value: guide.cibEur },
    { label: "New", value: guide.newEur },
  ];
  return <section className="collection-panel p-4 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><p className="eyebrow">PREÇOS</p><h2 className="text-lg font-black text-slate-950">Referências de mercado</h2></div>
      <p className="text-[11px] font-semibold text-slate-400">{guide.date ? `${guide.source} · ${guide.date}` : guide.source}</p>
    </div>
    <div className="mt-4 grid grid-cols-3 gap-2">
      {entries.map((entry) => {
        const content = <><span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">PriceCharting {entry.label}</span><strong className="mt-1 block text-base font-black text-slate-950">{entry.value === null ? "—" : formatEuro(entry.value)}</strong></>;
        return guide.productUrl
          ? <a key={entry.label} href={guide.productUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-[#f4f1e8] p-3 transition hover:bg-[#ece6d7]">{content}<ExternalLink className="mt-2 h-3.5 w-3.5 text-slate-400" /></a>
          : <div key={entry.label} className="rounded-xl bg-[#f4f1e8] p-3">{content}</div>;
      })}
    </div>
    {(cexCashEur !== null || maxPayEur !== null) && <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {cexCashEur !== null && <div className="rounded-xl border border-slate-200 bg-white p-3"><span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">CeX cash registado</span><strong className="mt-1 block text-base font-black text-slate-950">{formatEuro(cexCashEur)}</strong></div>}
      {maxPayEur !== null && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><span className="block text-[10px] font-black uppercase tracking-wide text-rose-500">Máximo que pago</span><strong className="mt-1 block text-lg font-black text-rose-800">{formatEuro(maxPayEur)}</strong></div>}
    </div>}
  </section>;
}
