import { ExternalLink } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { targetBuyCondition, type CexWishlistGuide, type WishlistBuyReferenceGuide } from "@/lib/wishlist-buy-reference.logic";

export function WishlistBuyReferencePanel({
  guide,
  cexGuide,
  targetVersion,
  manualReferenceEur = null,
}: {
  guide: WishlistBuyReferenceGuide;
  cexGuide: CexWishlistGuide;
  targetVersion: string;
  manualReferenceEur?: number | null;
}) {
  const target = targetBuyCondition(targetVersion);
  const entries = [
    { key: "loose" as const, label: "Loose", value: guide.loose, cexStatus: cexGuide.loose.status },
    { key: "cib" as const, label: "CIB", value: guide.cib, cexStatus: cexGuide.cib.status },
  ];

  return <section className="collection-panel p-4 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="eyebrow">COMPRA</p>
        <h2 className="text-lg font-black text-slate-950">Referência de compra</h2>
        <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
          Cruza PriceCharting com o ponto médio entre o que a CeX paga em cash e o preço a que vende. Só usamos correspondências CeX explícitas e seguras para Loose/CIB.
        </p>
      </div>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {entries.map((entry) => {
        const item = entry.value;
        const matchedCex = item.cex;
        return <article key={entry.key} className={"rounded-2xl border p-4 " + (target === entry.key ? "border-[#9bb45a] bg-[#f1f5df]" : "border-[#ded8cb] bg-[#faf8f2]")}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{entry.label}</span>
              {target === entry.key && <span className="ml-2 rounded-full bg-[#d9f36a] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#17382e]">Alvo</span>}
            </div>
            <span className="text-[10px] font-bold text-slate-400">{item.sourceCount === 2 ? "2 fontes" : item.sourceCount === 1 ? "1 fonte" : "sem referência"}</span>
          </div>

          <strong className="mt-2 block text-2xl font-black tracking-tight text-slate-950">{item.valueEur === null ? "—" : formatEuro(item.valueEur)}</strong>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#466558]">referência calculada</span>

          <div className="mt-3 grid gap-2 text-xs">
            <div className="rounded-xl bg-white px-3 py-2">
              <span className="font-bold text-slate-500">PriceCharting</span>
              <strong className="float-right text-slate-900">{item.pricechartingEur === null ? "—" : formatEuro(item.pricechartingEur)}</strong>
            </div>
            <div className="rounded-xl bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-500">CeX Portugal</span>
                {matchedCex && <a href={matchedCex.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-black text-[#315b47]">abrir <ExternalLink className="h-3 w-3" /></a>}
              </div>
              {matchedCex ? <div className="mt-1 grid grid-cols-3 gap-1 text-[11px]">
                <span><span className="block text-slate-400">cash</span><strong>{formatEuro(matchedCex.cashEur)}</strong></span>
                <span><span className="block text-slate-400">vende</span><strong>{formatEuro(matchedCex.sellEur)}</strong></span>
                <span><span className="block text-slate-400">meio</span><strong>{item.cexMidpointEur === null ? "—" : formatEuro(item.cexMidpointEur)}</strong></span>
              </div> : <p className="mt-1 text-[11px] font-semibold text-slate-400">{entry.cexStatus === "ambiguous" ? "Mais de uma variante segura; não escolhemos por ti." : "Sem correspondência explícita segura para esta condição."}</p>}
            </div>
          </div>
        </article>;
      })}
    </div>

    <p className="mt-3 text-[11px] font-semibold leading-5 text-slate-500">
      Fórmula atual: média entre PriceCharting e o ponto médio CeX quando existem as duas fontes; com uma só fonte, mostramos essa referência com menor confiança.
    </p>

    {manualReferenceEur !== null && <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs">
      <span className="font-bold text-slate-500">Referência manual antiga</span>
      <strong className="ml-2 text-slate-900">{formatEuro(manualReferenceEur)}</strong>
      <span className="ml-2 text-slate-400">· não entra no cálculo automático</span>
    </div>}
  </section>;
}
