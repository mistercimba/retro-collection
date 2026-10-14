"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WishlistArtwork } from "@/components/wishlist-artwork";
import { MarketSearchLinks } from "@/components/market-search-links";
import { Select } from "@/components/game-list-toolbar";
import { useUrlListState } from "@/hooks/use-url-list-state";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import { sortWishlistBuyingRows, type BuyingGroup, type BuyingRow, type BuyingSort } from "@/lib/wishlist-buying-shortlist.logic";

const DEFAULTS = { q: "", platform: "", priority: "", group: "all", sort: "priority" };
const SECTIONS: { key: BuyingGroup; title: string; description: string }[] = [
  {
    key: "within-ceiling",
    title: "Referência dentro do teu teto",
    description: "O valor calculado não ultrapassa o máximo definido por ti. Não significa que exista um anúncio a esse preço.",
  },
  {
    key: "below-reference",
    title: "O teu teto está abaixo da referência",
    description: "Terás de encontrar uma oferta mais barata do que a referência calculada ou rever o teto.",
  },
  {
    key: "incomplete",
    title: "Falta informação para comparar",
    description: "Não inventamos preços nem condições quando o alvo ou as fontes estão incompletos.",
  },
];

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT");

export function WishlistBuyingBrowser({ rows, initialSearch = "" }: { rows: BuyingRow[]; initialSearch?: string }) {
  const { state, update, currentSearch } = useUrlListState(DEFAULTS, initialSearch);
  const [limit, setLimit] = useState(24);
  const platforms = useMemo(() => [...new Set(rows.map((row) => row.platform))].sort((a, b) => a.localeCompare(b, "pt-PT")), [rows]);
  const priorities = useMemo(() => [...new Set(rows.map((row) => row.priority))].sort((a, b) => a.localeCompare(b, "pt-PT")), [rows]);
  const filtered = useMemo(() => {
    const query = normalize(state.q.trim());
    return sortWishlistBuyingRows(rows.filter((row) =>
      (!query || normalize([row.title, row.platform, row.targetVersion, row.priority].join(" ")).includes(query))
      && (!state.platform || row.platform === state.platform)
      && (!state.priority || row.priority === state.priority)
      && (state.group === "all" || row.group === state.group)
    ), state.sort as BuyingSort);
  }, [rows, state]);
  const origin = "/want/buying" + (currentSearch ? "?" + currentSearch : "");
  const hasFilters = Boolean(state.q || state.platform || state.priority || state.group !== "all" || state.sort !== "priority");
  const reset = () => {
    for (const key of ["q", "platform", "priority", "group", "sort"] as const) update(key, DEFAULTS[key], "replace");
  };

  return <div className="space-y-4">
    <section className="collection-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-black text-slate-950">Lista de procura</h2>
        <p role="status" className="text-xs font-bold text-slate-500">
          {filtered.length} de {rows.length} alvos por comprar
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_150px_130px_200px_175px]">
        <label className="flex min-h-11 min-w-0 items-center rounded-xl border border-slate-200 bg-white px-3">
          <span className="sr-only">Pesquisar alvos de compra</span>
          <input type="search" value={state.q} onChange={(event) => update("q", event.target.value, "replace")}
            placeholder="Pesquisar jogos…" className="min-w-0 w-full bg-transparent text-sm font-semibold outline-none" />
        </label>
        <Select label="Consola" value={state.platform} onChange={(value) => update("platform", value)} options={platforms.map((value) => ({ value, label: displayPlatform(value) }))} />
        <Select label="Prioridade" value={state.priority} onChange={(value) => update("priority", value)} options={priorities.map((value) => ({ value, label: value }))} />
        <Select label="Situação" value={state.group} onChange={(value) => update("group", value)} includeBlank={false} options={[
          { value: "all", label: "Todas as situações" },
          { value: "within-ceiling", label: "Referência dentro do teto" },
          { value: "below-reference", label: "Teto abaixo da referência" },
          { value: "incomplete", label: "Sem comparação" },
        ]} />
        <Select label="Ordenação" value={state.sort} onChange={(value) => update("sort", value)} includeBlank={false} options={[
          { value: "priority", label: "Prioridade" },
          { value: "difference-desc", label: "Maior margem" },
          { value: "reference-asc", label: "Referência mais baixa" },
          { value: "platform", label: "Consola" },
        ]} />
      </div>
      {hasFilters && <button type="button" onClick={reset} className="mt-3 min-h-9 text-xs font-black text-[#315b47] underline underline-offset-2">Limpar filtros</button>}
      <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">
        As categorias usam apenas Loose/CIB explícitos e a referência calculada para a mesma condição.
        Valores de fontes podem estar desatualizados; a CeX pode ter uma variante genérica.
      </p>
    </section>

    {filtered.length === 0 && <div className="collection-panel p-5 text-sm font-semibold text-slate-600">
      {rows.length === 0 ? "Não há alvos ativos e inequívocos por comprar neste momento." : "Nenhum alvo corresponde aos filtros escolhidos."}
    </div>}

    {SECTIONS.filter((section) => state.group === "all" || state.group === section.key).map((section) => {
      const group = filtered.filter((row) => row.group === section.key);
      if (!group.length) return null;
      return <section key={section.key} className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-black text-slate-950">{section.title} <span className="text-sm text-slate-500">· {group.length}</span></h2>
        </div>
        <p className="text-xs font-semibold leading-5 text-slate-600">{section.description}</p>
        <div className="grid gap-3 lg:grid-cols-2">
          {group.slice(0, limit).map((row) => {
            const params = new URLSearchParams({ platform: row.platform, title: row.title, from: origin });
            const href = "/wish/" + encodeURIComponent(row.targetId) + "?" + params.toString();
            return <article key={row.key} className="collection-panel min-w-0 p-3 sm:p-4">
              <div className="flex min-w-0 gap-3">
                <WishlistArtwork title={row.title} platform={row.platform} artworkSrc={row.artworkSrc} className="h-24 w-[72px] shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link href={href} prefetch={false} className="block text-sm font-black leading-5 text-slate-950 underline-offset-2 hover:text-[#315b47] hover:underline">
                    {row.title}
                  </Link>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{displayPlatform(row.platform)} · {row.priority}</p>
                  <p className="mt-1 break-words text-[11px] font-semibold text-slate-500">{row.targetVersion || "Condição por definir"}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <span><span className="block text-[10px] font-bold uppercase text-slate-500">Teu teto</span><strong className="text-sm text-slate-950">{formatEuro(row.ceilingEur)}</strong></span>
                    <span><span className="block text-[10px] font-bold uppercase text-slate-500">Referência {row.condition?.toUpperCase() ?? ""}</span><strong className="text-sm text-slate-950">{formatEuro(row.referenceEur)}</strong></span>
                  </div>
                </div>
              </div>
              {row.differenceEur !== null ? <p className="mt-3 rounded-lg bg-[#f1f4e8] px-3 py-2 text-xs font-bold text-[#315b47]">
                {row.differenceEur >= 0
                  ? "Referência " + formatEuro(row.differenceEur) + " abaixo do teu teto."
                  : "O teu teto está " + formatEuro(Math.abs(row.differenceEur)) + " abaixo da referência."}
              </p> : <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">{row.missingReason}</p>}
              {row.referenceEur !== null && <div className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">
                <p>{row.sourceCount} {row.sourceCount === 1 ? "fonte" : "fontes"} · PriceCharting: {formatEuro(row.pricechartingEur)}{row.pricechartingDate ? " (" + row.pricechartingDate + ")" : ""} · CeX meio: {formatEuro(row.cexMidpointEur)}{row.cexDate ? " (" + row.cexDate + ")" : ""}</p>
                {row.cexBasis === "generic" && <p className="font-bold text-amber-800">CeX: produto genérico sem condição explícita; confiança limitada.</p>}
              </div>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <MarketSearchLinks title={row.title} platform={row.platform} compact context="wantlist" />
                <Link href={href} prefetch={false} className="min-h-9 text-xs font-black leading-9 text-[#315b47] underline underline-offset-2">Ver alvo</Link>
              </div>
            </article>;
          })}
        </div>
        {group.length > limit && <button type="button" onClick={() => setLimit((value) => value + 24)}
          className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-[#315b47]">
          Mostrar mais ({group.length - limit} restantes)
        </button>}
      </section>;
    })}
  </div>;
}
