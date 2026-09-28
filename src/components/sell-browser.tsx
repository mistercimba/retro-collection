"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CollectionGame } from "@/lib/data/types";
import type { CollectionListGame } from "@/lib/game-list-data";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import type { SaleNoteFacts } from "@/lib/sale-history";
import { GameCard } from "./game-card";
import { GameListToolbar } from "./game-list-toolbar";
import { useUrlListState } from "@/hooks/use-url-list-state";
import { ActiveFilterChips, ListEmptyState, ListResultCount } from "./list-ux";

type SoldRecord = CollectionGame & SaleNoteFacts;
const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title, "pt-PT");
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT");
const DEFAULTS = { tab: "sell", q: "", platform: "", sort: "value-desc" };

export function SellBrowser({ forSale, sold, initialSearch = "" }: { forSale: CollectionListGame[]; sold: SoldRecord[]; initialSearch?: string }) {
  const pathname = usePathname();
  const { state, update, currentSearch } = useUrlListState(DEFAULTS, initialSearch);
  const tab = (state.tab === "sold" ? "sold" : "sell") as "sell" | "sold";
  const { q: query, platform, sort } = state;
  const effectiveSort = tab === "sold" && sort === "value-desc" ? "date-desc" : sort;
  const setQuery = (value: string) => update("q", value, "replace");
  const setPlatform = (value: string) => update("platform", value);
  const setSort = (value: string) => update("sort", value);
  const platforms = [...new Set((tab === "sell" ? forSale : sold).map((game) => game.platform))].sort((a, b) => a.localeCompare(b, "pt-PT"));
  const source = tab === "sell" ? forSale : sold;
  const duplicateCounts = new Map<string, number>();
  for (const game of source) {
    const key = `${normalize(game.title)}|${normalize(game.platform)}`;
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }
  const copyMarkers = new Map(source.filter((game) => duplicateCounts.get(`${normalize(game.title)}|${normalize(game.platform)}`)! > 1)
    .map((game) => [game.collectionId, `Cópia · ID ${game.collectionId}`] as const));
  const activeFilters = [
    ...(platform ? [{ key: "platform", label: `Plataforma: ${displayPlatform(platform)}`, onRemove: () => setPlatform("") }] : []),
    ...(query ? [{ key: "q", label: `Pesquisa: ${query}`, onRemove: () => setQuery("") }] : []),
  ];
  const clearFilters = () => { setQuery(""); setPlatform(""); };
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const result = source.filter((game) => (!q || normalize(`${game.title} ${game.platform} ${game.region} ${game.edition}`).includes(q)) && (!platform || game.platform === platform));
    return [...result].sort((a, b) => {
      if (tab === "sell" && (effectiveSort === "value-desc" || effectiveSort === "value-asc")) {
        const av = (a as CollectionListGame).currentValueEur;
        const bv = (b as CollectionListGame).currentValueEur;
        if (av === null && bv !== null) return 1;
        if (bv === null && av !== null) return -1;
        if (av !== null && bv !== null && av !== bv) return effectiveSort === "value-desc" ? bv - av : av - bv;
      }
      if (tab === "sold" && effectiveSort === "date-desc") return ((b as SoldRecord).date ?? "").localeCompare((a as SoldRecord).date ?? "") || byTitle(a, b);
      return byTitle(a, b);
    });
  }, [source, query, platform, effectiveSort, tab]);

  const sortOptions = tab === "sell"
    ? [{ value: "value-desc", label: "Valor decrescente" }, { value: "value-asc", label: "Valor crescente" }, { value: "title-asc", label: "Título A–Z" }]
    : [{ value: "date-desc", label: "Data mais recente" }, { value: "title-asc", label: "Título A–Z" }];

  function changeTab(next: "sell" | "sold") {
    setQuery("");
    setPlatform("");
    update("tab", next);
    setSort(next === "sell" ? "value-desc" : "date-desc");
  }

  return <div>
    <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-white p-1" role="tablist" aria-label="Vistas de saídas">
      <button type="button" role="tab" aria-selected={tab === "sell"} onClick={() => changeTab("sell")} className={`rounded-lg px-3 py-2 text-sm font-bold ${tab === "sell" ? "bg-emerald-950 text-white" : "text-slate-600"}`}>Para vender <span className="ml-1 opacity-70">{forSale.length}</span></button>
      <button type="button" role="tab" aria-selected={tab === "sold"} onClick={() => changeTab("sold")} className={`rounded-lg px-3 py-2 text-sm font-bold ${tab === "sold" ? "bg-emerald-950 text-white" : "text-slate-600"}`}>Vendidos <span className="ml-1 opacity-70">{sold.length}</span></button>
    </div>
    <GameListToolbar query={query} setQuery={setQuery} platform={platform} setPlatform={setPlatform} platforms={platforms.map((value) => ({ value, label: displayPlatform(value) }))} sort={effectiveSort} setSort={setSort} sortOptions={sortOptions} filtersOpen={false} onToggleFilters={() => undefined} activeFilterCount={0} showFilters={false} searchLabel="Pesquisar nas saídas" />
    <ActiveFilterChips filters={activeFilters} />
    <div className="my-3"><ListResultCount filtered={filtered.length} total={source.length} /></div>
    {tab === "sell" ? filtered.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(filtered as CollectionListGame[]).map((game) => <GameCard key={game.collectionId} game={game} sale copyMarker={copyMarkers.get(game.collectionId)} returnTo={`${pathname}${currentSearch ? `?${currentSearch}` : ""}`} />)}</div> : <Empty onClear={activeFilters.length ? clearFilters : undefined} /> : filtered.length ? <div className="space-y-2">{(filtered as SoldRecord[]).map((game) => <article key={game.collectionId} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{displayPlatform(game.platform)}{game.edition ? ` · ${game.edition}` : ""}</p><h2 className="mt-1 text-sm font-extrabold text-slate-950"><Link className="hover:text-emerald-800" href={`/game/${encodeURIComponent(game.collectionId)}?from=${encodeURIComponent(`${pathname}${currentSearch ? `?${currentSearch}` : ""}`)}`}>{game.title}</Link></h2><p className="mt-1 text-xs text-slate-500">{game.region}{game.conditionGrade ? ` · ${game.conditionGrade}` : ""}{copyMarkers.has(game.collectionId) ? ` · ${copyMarkers.get(game.collectionId)}` : ""}</p></div><div className="text-right text-xs">{game.date ? <p className="font-semibold text-slate-700">{new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${game.date}T00:00:00Z`))}</p> : <p className="text-slate-400">Data não registada</p>}{game.priceEur !== null ? <p className="mt-1 font-black text-slate-950">{formatEuro(game.priceEur)} recebidos</p> : <p className="mt-1 text-slate-400">Preço não registado</p>}</div></div>
      {game.notes && <details className="mt-3 border-t border-slate-100 pt-2"><summary className="cursor-pointer text-xs font-bold text-slate-500">Notas históricas</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{game.notes}</p></details>}
    </article>)}</div> : <Empty onClear={activeFilters.length ? clearFilters : undefined} />}
  </div>;
}

function Empty({ onClear }: { onClear?: () => void }) { return <ListEmptyState title="Nenhum item encontrado" description="Limpa os filtros ou a pesquisa para voltar a ver itens." onClear={onClear} />; }
