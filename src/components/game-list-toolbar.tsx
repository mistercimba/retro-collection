import { Search, SlidersHorizontal } from "lucide-react";

type Option = { value: string; label: string };

export function GameListToolbar({
  query, setQuery, platform, setPlatform, platforms, sort, setSort, sortOptions, filtersOpen, onToggleFilters, activeFilterCount, showFilters = true, searchLabel = "Pesquisar jogos",
}: {
  query: string; setQuery: (value: string) => void;
  platform: string; setPlatform: (value: string) => void;
  platforms: Option[]; sort: string; setSort: (value: string) => void; sortOptions: Option[];
  filtersOpen: boolean; onToggleFilters: () => void; activeFilterCount: number; showFilters?: boolean; searchLabel?: string;
}) {
  return <div className="flex flex-col gap-2 sm:flex-row">
    <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-emerald-700"><Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /><input aria-label={searchLabel} value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Pesquisar título, edição ou região" /></label>
    {platforms.length > 0 && <Select label="Plataforma" value={platform} onChange={setPlatform} options={platforms} />}
    <Select label="Ordenar" value={sort} onChange={setSort} options={sortOptions} includeBlank={false} />
    {showFilters && <button type="button" onClick={onToggleFilters} aria-expanded={filtersOpen} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><SlidersHorizontal className="h-4 w-4" />Filtros{activeFilterCount > 0 && <span className="rounded-full bg-emerald-100 px-1.5 text-xs text-emerald-900">{activeFilterCount}</span>}</button>}
  </div>;
}

export function Select({ label, value, onChange, options, includeBlank = true }: { label: string; value: string; onChange: (value: string) => void; options: Option[]; includeBlank?: boolean }) {
  return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700">{includeBlank && <option value="">{label}</option>}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}
