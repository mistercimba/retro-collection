"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { CollectionListGame } from "@/lib/game-list-data";
import { displayPlatform } from "@/lib/data/platforms";
import { collectIndividualGenres, splitGenres } from "@/lib/genre-filter.logic";
import { useUrlListState } from "@/hooks/use-url-list-state";
import { GameCard } from "./game-card";
import { GameListToolbar, Select } from "./game-list-toolbar";

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-PT"));
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT");
const sortOptions = [
  { value: "title-asc", label: "Título A–Z" },
  { value: "title-desc", label: "Título Z–A" },
  { value: "value-asc", label: "Valor crescente" },
  { value: "value-desc", label: "Valor decrescente" },
];
const DEFAULTS = { q: "", platform: "", status: "", condition: "", region: "", edition: "", genre: "", review: false, sort: "title-asc" };

export function CollectionBrowser({ games, global = false, initialSearch = "" }: { games: CollectionListGame[]; global?: boolean; initialSearch?: string }) {
  const pathname = usePathname();
  const { state, update, currentSearch } = useUrlListState(DEFAULTS, initialSearch);
  const { q: query, platform, status, condition, region, edition, genre, review: reviewOnly, sort } = state;
  const setQuery = (value: string) => update("q", value, "replace");
  const setPlatform = (value: string) => update("platform", value);
  const setStatus = (value: string) => update("status", value);
  const setCondition = (value: string) => update("condition", value);
  const setRegion = (value: string) => update("region", value);
  const setEdition = (value: string) => update("edition", value);
  const setGenre = (value: string) => update("genre", value);
  const setReviewOnly = (value: boolean) => update("review", value);
  const setSort = (value: string) => update("sort", value);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const platforms = unique(games.map((game) => game.platform));
  const statuses = unique(games.map((game) => game.overallStatus));
  const conditions = unique(games.map((game) => game.conditionGrade));
  const regions = unique(games.map((game) => game.region));
  const editions = unique(games.map((game) => game.edition));
  const genres = collectIndividualGenres(games.map((game) => game.genre));
  const activeFilterCount = Number(Boolean(platform)) + Number(Boolean(status)) + Number(Boolean(condition)) + Number(Boolean(region)) + Number(Boolean(edition)) + Number(Boolean(genre)) + Number(reviewOnly);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const result = games.filter((game) => {
      const haystack = normalize(`${game.title} ${game.platform} ${game.collectionId} ${game.edition} ${game.region} ${game.genre}`);
      return (!q || haystack.includes(q)) && (!platform || game.platform === platform) && (!status || game.overallStatus === status) && (!condition || game.conditionGrade === condition) && (!region || game.region === region) && (!edition || game.edition === edition) && (!genre || splitGenres(game.genre).includes(genre)) && (!reviewOnly || game.needsReview);
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
  }, [games, query, platform, status, condition, region, edition, genre, reviewOnly, sort]);

  const clear = () => { setPlatform(""); setStatus(""); setCondition(""); setRegion(""); setEdition(""); setGenre(""); setReviewOnly(false); setSort("title-asc"); };
  const filterFields = <>
    {global && <Select label="Plataforma" value={platform} onChange={setPlatform} options={platforms.map((value) => ({ value, label: displayPlatform(value) }))} />}
    <Select label="Completude" value={status} onChange={setStatus} options={statuses.map((value) => ({ value, label: value }))} />
    <Select label="Condição" value={condition} onChange={setCondition} options={conditions.map((value) => ({ value, label: value }))} />
    <Select label="Região" value={region} onChange={setRegion} options={regions.map((value) => ({ value, label: value }))} />
    <Select label="Edição" value={edition} onChange={setEdition} options={editions.map((value) => ({ value, label: value }))} />
    <Select label="Género" value={genre} onChange={setGenre} options={genres.map((value) => ({ value, label: value }))} />
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm"><input type="checkbox" checked={reviewOnly} onChange={(event) => setReviewOnly(event.target.checked)} />Só a rever</label>
    {activeFilterCount > 0 && <button type="button" onClick={clear} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">Limpar filtros</button>}
  </>;

  return <div>
    <div className="sticky top-16 z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:p-3">
      <GameListToolbar query={query} setQuery={setQuery} platform={platform} setPlatform={setPlatform} platforms={global ? platforms.map((value) => ({ value, label: displayPlatform(value) })) : []} sort={sort} setSort={setSort} sortOptions={sortOptions} filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen((open) => !open)} activeFilterCount={activeFilterCount} searchLabel="Pesquisar na coleção" />
      {filtersOpen && <>
        <div className="mt-3 hidden grid-cols-2 gap-2 md:grid lg:grid-cols-4">{filterFields}</div>
        <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/40 p-0 md:hidden" role="presentation" onClick={() => setFiltersOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="Filtros da coleção" className="max-h-[82dvh] w-full overflow-y-auto rounded-t-3xl bg-slate-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h2 className="font-black text-slate-950">Filtros</h2><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros" className="rounded-full p-2 hover:bg-white"><X className="h-5 w-5" /></button></div>
            <div className="grid gap-2">{filterFields}</div>
            <button type="button" onClick={() => setFiltersOpen(false)} className="mt-3 min-h-11 w-full rounded-xl bg-emerald-900 px-4 text-sm font-bold text-white">Ver {filtered.length} jogos</button>
          </section>
        </div>
      </>}
    </div>
    <div className="my-4 flex items-center justify-between text-sm"><p className="font-semibold text-slate-700">{filtered.length} {filtered.length === 1 ? "jogo" : "jogos"}</p><span className="text-xs text-slate-500">{reviewOnly ? "Filtro ativo: A rever" : activeFilterCount ? `${activeFilterCount} filtros ativos` : "Na coleção"}</span></div>
    {filtered.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((game) => <GameCard key={game.collectionId} game={game} returnTo={`${pathname}${currentSearch ? `?${currentSearch}` : ""}`} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="font-bold text-slate-900">Nenhum jogo encontrado</p><p className="mt-1 text-sm text-slate-500">Experimenta limpar um ou dois filtros.</p></div>}
  </div>;
}
