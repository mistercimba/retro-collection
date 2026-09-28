"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { BadgeEuro, Heart, Target, X } from "lucide-react";
import { MobileFilterDialog } from "./mobile-filter-dialog";
import type { WantListEntry } from "@/lib/data/types";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import { MarketSearchLinks } from "./market-search-links";
import { GameListToolbar, Select } from "./game-list-toolbar";
import { ActiveFilterChips, ListEmptyState } from "./list-ux";
import { collectWantlistRegions, collectWantlistVariants, normalizeWantlistRegion, normalizeWantlistVariant } from "@/lib/wantlist-facets.logic";
import { useUrlListState } from "@/hooks/use-url-list-state";

const recommendedRank: Record<string, number> = { grail: 0, alta: 0, média: 1, media: 1, baixa: 2 };
const priorityRank: Record<string, number> = { grail: 0, alta: 1, média: 2, media: 2, baixa: 3 };
const priorityStyle: Record<string, string> = { alta: "want-priority-high", média: "want-priority-medium", media: "want-priority-medium", baixa: "want-priority-low", grail: "want-priority-grail" };
const sortOptions = [
  { value: "recommended", label: "Recomendada" },
  { value: "priority", label: "Prioridade" },
  { value: "platform", label: "Plataforma" },
  { value: "title-asc", label: "Título A–Z" },
  { value: "title-desc", label: "Título Z–A" },
  { value: "ceiling-asc", label: "Teto crescente" },
  { value: "ceiling-desc", label: "Teto decrescente" },
];
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-PT"));
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT");
const DEFAULTS = { q: "", platform: "", priority: "", region: "", variant: "", ceiling: "", ambiguity: "", sort: "recommended" };

export function WantlistBrowser({ targets, initialSearch = "" }: { targets: WantListEntry[]; initialSearch?: string }) {
  const active = targets.filter((target) => target.planState !== "inactive" && target.matchState !== "acquired");
  const inactive = targets.filter((target) => target.planState === "inactive");
  const pathname = usePathname();
  const { state, update, currentSearch } = useUrlListState(DEFAULTS, initialSearch);
  const { q: query, platform, priority, region, variant, ceiling, ambiguity, sort } = state;
  const setQuery = (value: string) => update("q", value, "replace");
  const setPlatform = (value: string) => update("platform", value);
  const setPriority = (value: string) => update("priority", value);
  const setRegion = (value: string) => update("region", value);
  const setVariant = (value: string) => update("variant", value);
  const setCeiling = (value: string) => update("ceiling", value);
  const setAmbiguity = (value: string) => update("ambiguity", value);
  const setSort = (value: string) => update("sort", value);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const platforms = unique(active.map((target) => target.platform));
  const regions = collectWantlistRegions(active.map((target) => target.targetVersion));
  const variants = collectWantlistVariants(active.map((target) => target.targetVersion));
  const priorities = unique(active.map((target) => target.priority));
  const activeFilterCount = Number(Boolean(platform)) + Number(Boolean(priority)) + Number(Boolean(region)) + Number(Boolean(variant)) + Number(Boolean(ceiling)) + Number(Boolean(ambiguity));
  const activeFilters = [
    ...(platform ? [{ key: "platform", label: `Plataforma: ${displayPlatform(platform)}`, onRemove: () => setPlatform("") }] : []),
    ...(priority ? [{ key: "priority", label: `Prioridade: ${priority}`, onRemove: () => setPriority("") }] : []),
    ...(region ? [{ key: "region", label: `Região: ${region}`, onRemove: () => setRegion("") }] : []),
    ...(variant ? [{ key: "variant", label: `Variante: ${variant}`, onRemove: () => setVariant("") }] : []),
    ...(ceiling ? [{ key: "ceiling", label: ceiling === "defined" ? "Teto: com teto" : "Teto: sem teto", onRemove: () => setCeiling("") }] : []),
    ...(ambiguity ? [{ key: "ambiguity", label: ambiguity === "ambiguous" ? "Match: ambíguo" : "Match: sem ambiguidade", onRemove: () => setAmbiguity("") }] : []),
    ...(query ? [{ key: "q", label: `Pesquisa: ${query}`, onRemove: () => setQuery("") }] : []),
  ];

  const filtered = (() => {
    const q = normalize(query.trim());
    const result = active.filter((target) => {
      const haystack = normalize(`${target.title} ${target.platform} ${target.reason} ${target.targetVersion} ${target.status} ${target.targetId} ${target.notes}`);
      return (!q || haystack.includes(q)) && (!platform || target.platform === platform) && (!priority || target.priority === priority) && (!region || normalizeWantlistRegion(target.targetVersion) === region) && (!variant || normalizeWantlistVariant(target.targetVersion) === variant) && (!ceiling || (ceiling === "defined" ? target.priceCeilingEur !== null : target.priceCeilingEur === null)) && (!ambiguity || (ambiguity === "ambiguous" ? target.matchState === "ambiguous" : target.matchState !== "ambiguous"));
    });
    const titleCompare = (a: WantListEntry, b: WantListEntry) => a.title.localeCompare(b.title, "pt-PT");
    const ceilingCompare = (a: WantListEntry, b: WantListEntry, direction: 1 | -1) => {
      if (a.priceCeilingEur === null && b.priceCeilingEur !== null) return 1;
      if (b.priceCeilingEur === null && a.priceCeilingEur !== null) return -1;
      return (a.priceCeilingEur !== null && b.priceCeilingEur !== null ? (a.priceCeilingEur - b.priceCeilingEur) * direction : 0) || a.platform.localeCompare(b.platform, "pt-PT") || titleCompare(a, b);
    };
    return [...result].sort((a, b) => {
      if (sort === "title-asc") return titleCompare(a, b) || a.platform.localeCompare(b.platform, "pt-PT");
      if (sort === "title-desc") return -titleCompare(a, b) || a.platform.localeCompare(b.platform, "pt-PT");
      if (sort === "platform") return a.platform.localeCompare(b.platform, "pt-PT") || titleCompare(a, b);
      if (sort === "ceiling-asc") return ceilingCompare(a, b, 1);
      if (sort === "ceiling-desc") return ceilingCompare(a, b, -1);
      if (sort === "priority") return (priorityRank[a.priority.trim().toLocaleLowerCase("pt-PT")] ?? 3) - (priorityRank[b.priority.trim().toLocaleLowerCase("pt-PT")] ?? 3) || ceilingCompare(a, b, 1);
      return (recommendedRank[a.priority.trim().toLocaleLowerCase("pt-PT")] ?? 3) - (recommendedRank[b.priority.trim().toLocaleLowerCase("pt-PT")] ?? 3) || Number(b.priceCeilingEur !== null) - Number(a.priceCeilingEur !== null) || a.platform.localeCompare(b.platform, "pt-PT") || titleCompare(a, b);
    });
  })();

  const clear = () => { setPlatform(""); setPriority(""); setRegion(""); setVariant(""); setCeiling(""); setAmbiguity(""); };
  const clearAll = () => { setQuery(""); clear(); };
  const controls = <>
    <Select label="Plataforma" value={platform} onChange={setPlatform} options={platforms.map((value) => ({ value, label: displayPlatform(value) }))} />
    <Select label="Prioridade" value={priority} onChange={setPriority} options={priorities.map((value) => ({ value, label: value }))} />
    {regions.length > 0 && <Select label="Região" value={region} onChange={setRegion} options={regions.map((value) => ({ value, label: value }))} />}
    {variants.length > 0 && <Select label="Variante" value={variant} onChange={setVariant} options={variants.map((value) => ({ value, label: value }))} />}
    <Select label="Teto de compra" value={ceiling} onChange={setCeiling} options={[{ value: "defined", label: "Com teto" }, { value: "missing", label: "Sem teto" }]} />
    <Select label="Estado do match" value={ambiguity} onChange={setAmbiguity} options={[{ value: "ambiguous", label: "Ambíguos" }, { value: "clear", label: "Sem ambiguidade" }]} />
    {activeFilterCount > 0 && <button type="button" onClick={clear} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">Limpar filtros</button>}
  </>;

  const counts = {
    missing: active.length,
    grails: active.filter((target) => target.priority.toLocaleLowerCase("pt-PT") === "grail").length,
    high: active.filter((target) => target.priority.toLocaleLowerCase("pt-PT") === "alta").length,
    noCeiling: active.filter((target) => target.priceCeilingEur === null).length,
    ambiguous: active.filter((target) => target.matchState === "ambiguous").length,
  };

  return <div className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">CAÇADA EM CURSO</p><h1 className="section-title">À procura</h1><p className="mt-1 text-sm text-slate-600">Alvos ativos, recalculados com a coleção atual.</p></div><Heart className="mb-1 h-5 w-5 text-rose-700" aria-hidden="true" /></header>
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">{[[counts.missing, "em falta"], [counts.grails, "Grails"], [counts.high, "prioridade alta"], [counts.noCeiling, "sem teto"], [counts.ambiguous, "ambíguos"]].map(([value, label]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xl font-black text-slate-950">{value}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p></div>)}</section>
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <GameListToolbar query={query} setQuery={setQuery} platform="" setPlatform={() => undefined} platforms={[]} sort={sort} setSort={setSort} sortOptions={sortOptions} filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen((open) => !open)} activeFilterCount={activeFilterCount} searchLabel="Pesquisar À procura" />
      <ActiveFilterChips filters={activeFilters} />
      {filtersOpen && <>
        <div className="mt-3 hidden grid-cols-2 gap-2 md:grid lg:grid-cols-5">{controls}</div>
        <MobileFilterDialog open={filtersOpen} onClose={() => setFiltersOpen(false)} label="Filtros da lista à procura"><div className="mb-4 flex items-center justify-between"><h2 className="font-black">Filtros</h2><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white"><X className="h-5 w-5" /></button></div><div className="grid gap-2">{controls}</div><button type="button" onClick={() => setFiltersOpen(false)} className="mt-3 min-h-11 w-full rounded-xl bg-emerald-950 font-bold text-white">Ver {filtered.length} alvos</button></MobileFilterDialog>
      </>}
    </div>
    <div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>{filtered.length} de {active.length} alvos</span><span>Ordenação: {sortOptions.find((option) => option.value === sort)?.label}</span></div>
    {filtered.length ? <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {filtered.map((target) => {
        const key = target.priority.trim().toLocaleLowerCase("pt-PT");
        return <article key={`${target.platform}:${target.targetId}:${target.title}`} className="px-3 py-3 sm:px-4">
            <div className="flex items-start gap-3"><span className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${priorityStyle[key] ?? "want-priority-low"}`}><Target className="h-3 w-3" aria-hidden="true" />{target.priority || "Sem prioridade"}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h2 className="min-w-0 text-sm font-extrabold leading-tight text-slate-950">{target.title}</h2>{target.matchState === "ambiguous" && <span className="want-ambiguous-badge">Ambíguo</span>}{target.planState === "unknown" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Estado do alvo por confirmar</span>}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold text-slate-500">{displayPlatform(target.platform)}{target.targetVersion ? ` · Versão alvo: ${target.targetVersion}` : ""}</p>
              {target.priceCeilingEur !== null ? <p className="inline-flex items-center gap-1.5 rounded-lg border border-lime-200 bg-lime-50 px-2.5 py-1.5 text-[11px] text-lime-950"><BadgeEuro className="h-3.5 w-3.5" aria-hidden="true" /><span>Máximo a pagar</span><strong className="text-sm">{formatEuro(target.priceCeilingEur)}</strong></p> : <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900">Teto por definir</p>}
            </div>
            {target.reason && <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-600">{target.reason}</p>}
            {target.possibleMatch && <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-amber-900">Possível correspondência na coleção</p><Link className="mt-1 inline-flex min-h-9 items-center font-bold text-amber-950 underline decoration-amber-400 underline-offset-2" href={`/game/${encodeURIComponent(target.possibleMatch.collectionId)}?from=${encodeURIComponent(`${pathname}${currentSearch ? `?${currentSearch}` : ""}`)}`}>Confirmar cópia: {target.possibleMatch.title} · {target.possibleMatch.region || "região n/d"}</Link><p className="text-[10px] text-amber-800">Confirma antes de comprar; o alvo continua ambíguo.</p></div>}
            {target.matchReason === "unknown-plan-state" && <p className="mt-1 text-[11px] text-amber-800">Estado do alvo não reconhecido; não foi marcado como adquirido.</p>}
            {target.notes && <details className="mt-1 text-[11px] text-slate-500"><summary className="cursor-pointer font-semibold">Notas do alvo</summary><p className="mt-1 whitespace-pre-wrap">{target.notes}</p></details>}
            <div className="mt-2"><MarketSearchLinks title={target.title} platform={target.platform} compact context="wantlist" /></div>
          </div></div>
        </article>;
      })}
    </div> : <ListEmptyState title={active.length ? "Nenhum alvo encontrado" : "Não há alvos ativos"} description={active.length ? "Limpa os filtros ou a pesquisa para voltar a ver alvos." : "Os alvos ativos vão aparecer aqui."} onClear={active.length && (activeFilterCount > 0 || Boolean(query)) ? clearAll : undefined} /> }
    {inactive.length > 0 && <details className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-bold text-slate-700">{inactive.length} alvo{inactive.length === 1 ? "" : "s"} inativo{inactive.length === 1 ? "" : "s"} segundo o plano da coleção</summary><ul className="mt-3 space-y-2 text-sm text-slate-600">{inactive.map((target) => <li key={`${target.platform}:${target.targetId}:${target.title}`} className="flex flex-wrap justify-between gap-2"><span>{target.title} · {displayPlatform(target.platform)}</span><span className="text-xs font-semibold text-slate-400">{target.status || "Inativo"}</span></li>)}</ul></details>}
  </div>;
}
