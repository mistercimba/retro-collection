"use client";

import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { CollectionGame } from "@/lib/data/types";
import { GameCard } from "./game-card";
import { displayPlatform } from "@/lib/data/platforms";

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt"));

export function CollectionBrowser({ games, sale = false, initialPlatform = "" }: { games: CollectionGame[]; sale?: boolean; initialPlatform?: string }) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState(initialPlatform);
  const [status, setStatus] = useState("");
  const [condition, setCondition] = useState("");
  const [region, setRegion] = useState("");
  const [edition, setEdition] = useState("");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [sort, setSort] = useState("title");
  const [filtersOpen, setFiltersOpen] = useState(Boolean(initialPlatform));

  const platforms = unique(games.map((g) => g.platform));
  const statuses = unique(games.map((g) => g.overallStatus));
  const conditions = unique(games.map((g) => g.conditionGrade));
  const regions = unique(games.map((g) => g.region));
  const editions = unique(games.map((g) => g.edition));

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-PT");
    const result = games.filter((game) => {
      const haystack = `${game.title} ${game.platform} ${game.collectionId} ${game.edition} ${game.region}`.toLocaleLowerCase("pt-PT");
      return (!q || haystack.includes(q)) && (!platform || game.platform === platform) && (!status || game.overallStatus === status) && (!condition || game.conditionGrade === condition) && (!region || game.region === region) && (!edition || game.edition === edition) && (!reviewOnly || game.needsReview);
    });
    return [...result].sort((a, b) => sort === "value-desc" ? (b.marketValueEur ?? -1) - (a.marketValueEur ?? -1) : sort === "value-asc" ? (a.marketValueEur ?? Number.MAX_SAFE_INTEGER) - (b.marketValueEur ?? Number.MAX_SAFE_INTEGER) : a.title.localeCompare(b.title, "pt"));
  }, [games, query, platform, status, condition, region, edition, reviewOnly, sort]);

  const clear = () => { setQuery(""); setPlatform(""); setStatus(""); setCondition(""); setRegion(""); setEdition(""); setReviewOnly(false); setSort("title"); };
  const active = Boolean(query || platform || status || condition || region || edition || reviewOnly || sort !== "title");

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:p-4">
        <div className="flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-600"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 outline-none" placeholder="Pesquisar jogo..." /></label>
          <button onClick={() => setFiltersOpen((v) => !v)} className={`rounded-xl border px-3 ${filtersOpen ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700"}`}><SlidersHorizontal className="h-5 w-5" /></button>
        </div>
        {filtersOpen && <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Plataforma" value={platform} onChange={setPlatform} options={platforms.map((v) => [v, displayPlatform(v)])} />
          <Select label="Completude" value={status} onChange={setStatus} options={statuses.map((v) => [v, v])} />
          <Select label="Condição" value={condition} onChange={setCondition} options={conditions.map((v) => [v, v])} />
          <Select label="Região" value={region} onChange={setRegion} options={regions.map((v) => [v, v])} />
          <Select label="Edição" value={edition} onChange={setEdition} options={editions.map((v) => [v, v])} />
          <Select label="Ordenar" value={sort} onChange={setSort} options={[["title", "A–Z"], ["value-desc", "Valor ↓"], ["value-asc", "Valor ↑"]]} includeBlank={false} />
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} /> Só a rever</label>
          {active && <button onClick={clear} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> Limpar filtros</button>}
        </div>}
      </div>
      <div className="my-5 flex items-center justify-between"><p className="font-semibold text-slate-700">{filtered.length} {filtered.length === 1 ? "jogo" : "jogos"}</p><span className="flex items-center gap-1 text-xs text-slate-500"><Filter className="h-3.5 w-3.5" />{active ? "Filtrado" : "Todos"}</span></div>
      {filtered.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((game) => <GameCard key={game.collectionId} game={game} sale={sale} />)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-bold text-slate-900">Nenhum jogo encontrado</p><p className="mt-1 text-sm text-slate-500">Experimenta limpar um ou dois filtros.</p></div>}
    </div>
  );
}

function Select({ label, value, onChange, options, includeBlank = true }: { label: string; value: string; onChange: (value: string) => void; options: string[][]; includeBlank?: boolean }) {
  return <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600">{includeBlank && <option value="">{label}: todos</option>}{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>;
}
