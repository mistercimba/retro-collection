"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { MobileFilterDialog } from "./mobile-filter-dialog";
import type { CollectionListGame } from "@/lib/game-list-data";
import { displayPlatform } from "@/lib/data/platforms";
import { collectIndividualGenres, splitGenres } from "@/lib/genre-filter.logic";
import { useUrlListState } from "@/hooks/use-url-list-state";
import { GameCard } from "./game-card";
import { GameListToolbar, Select } from "./game-list-toolbar";
import { ActiveFilterChips, ListEmptyState, ListResultCount } from "./list-ux";
import { useListScrollRestoration } from "@/hooks/use-list-scroll-restoration";
import { collectionCopyIdentity } from "@/lib/copy-groups.logic";

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-PT"));
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT");
const sortOptions = [
  { value: "title-asc", label: "Título A–Z" },
  { value: "title-desc", label: "Título Z–A" },
  { value: "value-asc", label: "Valor crescente" },
  { value: "value-desc", label: "Valor decrescente" },
];
const DEFAULTS = { q: "", platform: "", status: "", condition: "", region: "", edition: "", genre: "", review: false, missingValue: false, missingPurchase: false, sort: "title-asc" };

export function CollectionBrowser({ games, global = false, initialSearch = "" }: { games: CollectionListGame[]; global?: boolean; initialSearch?: string }) {
  const pathname = usePathname();
  const { state, update, currentSearch } = useUrlListState(DEFAULTS, initialSearch);
  useListScrollRestoration();
  const { q: query, platform, status, condition, region, edition, genre, review: reviewOnly, missingValue, missingPurchase, sort } = state;
  const setQuery = (value: string) => update("q", value, "replace");
  const setPlatform = (value: string) => update("platform", value);
  const setStatus = (value: string) => update("status", value);
  const setCondition = (value: string) => update("condition", value);
  const setRegion = (value: string) => update("region", value);
  const setEdition = (value: string) => update("edition", value);
  const setGenre = (value: string) => update("genre", value);
  const setReviewOnly = (value: boolean) => update("review", value);
  const setMissingValue = (value: boolean) => update("missingValue", value);
  const setMissingPurchase = (value: boolean) => update("missingPurchase", value);
  const setSort = (value: string) => update("sort", value);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const platforms = unique(games.map((game) => game.platform));
  const statuses = unique(games.map((game) => game.overallStatus));
  const conditions = unique(games.map((game) => game.conditionGrade));
  const regions = unique(games.map((game) => game.region));
  const editions = unique(games.map((game) => game.edition));
  const genres = collectIndividualGenres(games.map((game) => game.genre));
  const activeFilterCount = Number(Boolean(platform)) + Number(Boolean(status)) + Number(Boolean(condition)) + Number(Boolean(region)) + Number(Boolean(edition)) + Number(Boolean(genre)) + Number(reviewOnly) + Number(missingValue) + Number(missingPurchase);
  const duplicateCounts = new Map<string, number>();
  for (const game of games) {
    const key = collectionCopyIdentity(game);
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }
  const copyMarkers = new Map(games.filter((game) => (duplicateCounts.get(collectionCopyIdentity(game)) ?? 0) > 1)
    .map((game) => [game.collectionId, `Cópia · ID ${game.collectionId}`] as const));
  const activeFilters = [
    ...(platform ? [{ key: "platform", label: `Plataforma: ${displayPlatform(platform)}`, onRemove: () => setPlatform("") }] : []),
    ...(status ? [{ key: "status", label: `Completude: ${status}`, onRemove: () => setStatus("") }] : []),
    ...(condition ? [{ key: "condition", label: `Condição: ${condition}`, onRemove: () => setCondition("") }] : []),
    ...(region ? [{ key: "region", label: `Região: ${region}`, onRemove: () => setRegion("") }] : []),
    ...(edition ? [{ key: "edition", label: `Edição: ${edition}`, onRemove: () => setEdition("") }] : []),
    ...(genre ? [{ key: "genre", label: `Género: ${genre}`, onRemove: () => setGenre("") }] : []),
    ...(reviewOnly ? [{ key: "review", label: "A rever", onRemove: () => setReviewOnly(false) }] : []),
    ...(missingValue ? [{ key: "missingValue", label: "Sem valor de mercado", onRemove: () => setMissingValue(false) }] : []),
    ...(missingPurchase ? [{ key: "missingPurchase", label: "Sem preço de compra", onRemove: () => setMissingPurchase(false) }] : []),
    ...(query ? [{ key: "q", label: `Pesquisa: ${query}`, onRemove: () => setQuery("") }] : []),
  ];

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const result = games.filter((game) => {
      const haystack = normalize(`${game.title} ${game.platform} ${game.collectionId} ${game.edition} ${game.region} ${game.genre}`);
      return (!q || haystack.includes(q)) && (!platform || game.platform === platform) && (!status || game.overallStatus === status) && (!condition || game.conditionGrade === condition) && (!region || game.region === region) && (!edition || game.edition === edition) && (!genre || splitGenres(game.genre).includes(genre)) && (!reviewOnly || game.needsReview) && (!missingValue || game.currentValueEur === null) && (!missingPurchase || game.purchasePaidEur === null);
    });
    return [...result].sort((a, b) => {
      if (sort === "value-asc" || sort === "value-desc") {
        const av = a.currentValueEur;
        const bv = b.currentValueEur;
        if (av === null && bv !== null) return 1;
        if (bv === null && av !== null) return -1;
        if (av !== null && bv !== null && av !== bv) return sort === "value-asc" ? av - bv : bv - av;
      }
      const title = a.title.localeCompare(b.title, "pt-PT");
      return sort === "title-desc" ? -title : title;
    });
  }, [games, query, platform, status, condition, region, edition, genre, reviewOnly, missingValue, missingPurchase, sort]);

  const clear = () => { setPlatform(""); setStatus(""); setCondition(""); setRegion(""); setEdition(""); setGenre(""); setReviewOnly(false); setMissingValue(false); setMissingPurchase(false); };
  const clearAll = () => { setQuery(""); clear(); };
  const filterFields = <>
    {global && <Select label="Plataforma" value={platform} onChange={setPlatform} options={platforms.map((value) => ({ value, label: displayPlatform(value) }))} />}
    <Select label="Completude" value={status} onChange={setStatus} options={statuses.map((value) => ({ value, label: value }))} />
    <Select label="Condição" value={condition} onChange={setCondition} options={conditions.map((value) => ({ value, label: value }))} />
    <Select label="Região" value={region} onChange={setRegion} options={regions.map((value) => ({ value, label: value }))} />
    <Select label="Edição" value={edition} onChange={setEdition} options={editions.map((value) => ({ value, label: value }))} />
    <Select label="Género" value={genre} onChange={setGenre} options={genres.map((value) => ({ value, label: value }))} />
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm"><input type="checkbox" checked={reviewOnly} onChange={(event) => setReviewOnly(event.target.checked)} />Só a rever</label>
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm"><input type="checkbox" checked={missingValue} onChange={(event) => setMissingValue(event.target.checked)} />Sem valor de mercado</label>
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm"><input type="checkbox" checked={missingPurchase} onChange={(event) => setMissingPurchase(event.target.checked)} />Sem preço de compra</label>
    {activeFilterCount > 0 && <button type="button" onClick={clear} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">Limpar filtros</button>}
  </>;

  return <div>
    <div className="sticky top-16 z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:p-3">
      <GameListToolbar query={query} setQuery={setQuery} platform={platform} setPlatform={setPlatform} platforms={global ? platforms.map((value) => ({ value, label: displayPlatform(value) })) : []} sort={sort} setSort={setSort} sortOptions={sortOptions} filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen((open) => !open)} activeFilterCount={activeFilterCount} searchLabel="Pesquisar na coleção" />
      <ActiveFilterChips filters={activeFilters} />
      {filtersOpen && <>
        <div className="mt-3 hidden grid-cols-2 gap-2 md:grid lg:grid-cols-4">{filterFields}</div>
        <MobileFilterDialog open={filtersOpen} onClose={() => setFiltersOpen(false)} label="Filtros da coleção">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-black text-slate-950">Filtros</h2><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white"><X className="h-5 w-5" /></button></div>
          <div className="grid gap-2">{filterFields}</div>
          <button type="button" onClick={() => setFiltersOpen(false)} className="mt-3 min-h-11 w-full rounded-xl bg-emerald-900 px-4 text-sm font-bold text-white">Ver {filtered.length} jogos</button>
        </MobileFilterDialog>
      </>}
    </div>
    <div className="my-4 flex items-center justify-between text-sm"><ListResultCount filtered={filtered.length} total={games.length} /><span className="text-xs text-slate-500">{activeFilterCount ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} ativo${activeFilterCount === 1 ? "" : "s"}` : "Na coleção"}</span></div>
    {filtered.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((game) => <GameCard key={game.collectionId} game={game} copyMarker={copyMarkers.get(game.collectionId)} returnTo={`${pathname}${currentSearch ? `?${currentSearch}` : ""}`} />)}</div> : <ListEmptyState title="Nenhum jogo encontrado" description="Limpa os filtros ou a pesquisa para voltar a ver jogos." onClear={activeFilterCount > 0 || Boolean(query) ? clearAll : undefined} />}
  </div>;
}