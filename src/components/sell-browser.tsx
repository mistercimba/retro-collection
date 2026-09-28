"use client";

import { useMemo, useState } from "react";
import type { CollectionGame } from "@/lib/data/types";
import type { CollectionListGame } from "@/lib/game-list-data";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import type { SaleNoteFacts } from "@/lib/sale-history";
import { GameCard } from "./game-card";
import { GameListToolbar } from "./game-list-toolbar";

type SoldRecord = CollectionGame & SaleNoteFacts;
const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title, "pt-PT");
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT");

export function SellBrowser({ forSale, sold }: { forSale: CollectionListGame[]; sold: SoldRecord[] }) {
  const [tab, setTab] = useState<"sell" | "sold">("sell");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("");
  const [sort, setSort] = useState("value-desc");
  const platforms = [...new Set((tab === "sell" ? forSale : sold).map((game) => game.platform))].sort((a, b) => a.localeCompare(b, "pt-PT"));
  const source = tab === "sell" ? forSale : sold;
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const result = source.filter((game) => (!q || normalize(`${game.title} ${game.platform} ${game.region} ${game.edition}`).includes(q)) && (!platform || game.platform === platform));
    return [...result].sort((a, b) => {
      if (tab === "sell" && (sort === "value-desc" || sort === "value-asc")) {
        const av = (a as CollectionListGame).currentValueEur;
        const bv = (b as CollectionListGame).currentValueEur;
        if (av === null && bv !== null) return 1;
        if (bv === null && av !== null) return -1;
        if (av !== null && bv !== null && av !== bv) return sort === "value-desc" ? bv - av : av - bv;
      }
      if (tab === "sold" && sort === "date-desc") return ((b as SoldRecord).date ?? "").localeCompare((a as SoldRecord).date ?? "") || byTitle(a, b);
      return byTitle(a, b);
    });
  }, [source, query, platform, sort, tab]);

  const sortOptions = tab === "sell"
    ? [{ value: "value-desc", label: "Valor decrescente" }, { value: "value-asc", label: "Valor crescente" }, { value: "title-asc", label: "Título A–Z" }]
    : [{ value: "date-desc", label: "Data mais recente" }, { value: "title-asc", label: "Título A–Z" }];

  function changeTab(next: "sell" | "sold") {
    setTab(next);
    setQuery("");
    setPlatform("");
    setSort(next === "sell" ? "value-desc" : "date-desc");
  }

  return <div>
    <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-white p-1" role="tablist" aria-label="Vistas de saídas">
      <button type="button" role="tab" aria-selected={tab === "sell"} onClick={() => changeTab("sell")} className={`rounded-lg px-3 py-2 text-sm font-bold ${tab === "sell" ? "bg-emerald-950 text-white" : "text-slate-600"}`}>Para vender <span className="ml-1 opacity-70">{forSale.length}</span></button>
      <button type="button" role="tab" aria-selected={tab === "sold"} onClick={() => changeTab("sold")} className={`rounded-lg px-3 py-2 text-sm font-bold ${tab === "sold" ? "bg-emerald-950 text-white" : "text-slate-600"}`}>Vendidos <span className="ml-1 opacity-70">{sold.length}</span></button>
    </div>
    <GameListToolbar query={query} setQuery={setQuery} platform={platform} setPlatform={setPlatform} platforms={platforms.map((value) => ({ value, label: displayPlatform(value) }))} sort={sort} setSort={setSort} sortOptions={sortOptions} filtersOpen={false} onToggleFilters={() => undefined} activeFilterCount={0} showFilters={false} />
    <p className="my-3 text-xs font-semibold text-slate-500">{filtered.length} {filtered.length === 1 ? "jogo" : "jogos"}</p>
    {tab === "sell" ? filtered.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(filtered as CollectionListGame[]).map((game) => <GameCard key={game.collectionId} game={game} sale />)}</div> : <Empty /> : filtered.length ? <div className="space-y-2">{(filtered as SoldRecord[]).map((game) => <article key={game.collectionId} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{displayPlatform(game.platform)}{game.edition ? ` · ${game.edition}` : ""}</p><h2 className="mt-1 text-sm font-extrabold text-slate-950">{game.title}</h2><p className="mt-1 text-xs text-slate-500">{game.region}{game.conditionGrade ? ` · ${game.conditionGrade}` : ""}</p></div><div className="text-right text-xs">{game.date ? <p className="font-semibold text-slate-700">{new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${game.date}T00:00:00Z`))}</p> : <p className="text-slate-400">Data não registada</p>}{game.priceEur !== null ? <p className="mt-1 font-black text-slate-950">{formatEuro(game.priceEur)} recebidos</p> : <p className="mt-1 text-slate-400">Preço não registado</p>}</div></div>
      {game.notes && <details className="mt-3 border-t border-slate-100 pt-2"><summary className="cursor-pointer text-xs font-bold text-slate-500">Notas históricas</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{game.notes}</p></details>}
    </article>)}</div> : <Empty />}
  </div>;
}

function Empty() { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Não há itens nesta vista com estes filtros.</div>; }
