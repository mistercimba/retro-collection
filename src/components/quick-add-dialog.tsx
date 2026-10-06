"use client";

import { AlertTriangle, ChevronLeft, Database, Plus, Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { CollectionSelectField } from "@/components/collection-select-field";
import { CONDITION_OPTIONS, LANGUAGE_OPTIONS, REGION_OPTIONS } from "@/lib/collection-field-options";
import { addCollectionGame } from "@/lib/library-actions";
import {
  CATALOG_PLATFORMS,
  type CanonicalGameCandidate,
} from "@/lib/igdb-catalog.logic";
import type { CatalogLibraryBadge, CatalogLibraryState } from "@/lib/catalog-library-state.logic";
import { physicalCopyProfile, type PhysicalComponentKey } from "@/lib/physical-copy-profile.logic";

type SearchState = "idle" | "loading" | "loaded" | "error";
type CatalogSearchCandidate = CanonicalGameCandidate & { libraryState?: CatalogLibraryState };

function isSearchableQuery(value: string) {
  const trimmed = value.trim();
  const idLike = /^(?:igdb\s*[:#-]?\s*)?#?\d{1,9}$/i.test(trimmed);
  return trimmed.length <= 120 && (idLike || trimmed.length >= 2);
}

export function QuickAddDialog({
  platforms,
  trigger,
}: {
  platforms: string[];
  trigger: "sidebar" | "mobile";
}) {
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [results, setResults] = useState<CatalogSearchCandidate[]>([]);
  const [selected, setSelected] = useState<CatalogSearchCandidate | null>(null);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchError, setSearchError] = useState("");
  const [sealed, setSealed] = useState("no");
  const searchRef = useRef<HTMLInputElement>(null);
  const manualTitleRef = useRef<HTMLInputElement>(null);
  const platformListId = useMemo(() => `quick-add-platform-${trigger}`, [trigger]);
  const completenessListId = useMemo(() => `quick-add-completeness-${trigger}`, [trigger]);
  const allPlatforms = useMemo(
    () => [...new Set([...CATALOG_PLATFORMS, ...platforms])].sort((a, b) => a.localeCompare(b, "pt-PT")),
    [platforms],
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => (manualMode ? manualTitleRef : searchRef).current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, manualMode]);

  useEffect(() => {
    if (!open || manualMode || selected) return;
    const trimmed = query.trim();
    if (!isSearchableQuery(trimmed)) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchState("loading");
      setSearchError("");
      const params = new URLSearchParams({ q: trimmed });
      if (platformFilter) params.set("platform", platformFilter);
      fetch(`/api/catalog/search?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload?.error || "Pesquisa indisponível.");
          setResults(Array.isArray(payload?.results) ? payload.results : []);
          setSearchState("loaded");
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setSearchState("error");
          setSearchError(error instanceof Error ? error.message : "Pesquisa indisponível.");
        });
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, manualMode, selected, query, platformFilter]);

  const close = () => {
    setOpen(false);
    setManualMode(false);
    setQuery("");
    setPlatformFilter("");
    setResults([]);
    setSelected(null);
    setSearchState("idle");
    setSearchError("");
    setSealed("no");
  };

  const triggerButton = trigger === "sidebar"
    ? <button type="button" onClick={() => setOpen(true)} className="side-nav-link side-nav-action w-full text-left">
        <Plus className="h-5 w-5" /><span>Adicionar jogo</span>
      </button>
    : <button type="button" onClick={() => setOpen(true)} className="mobile-nav-link text-[#17382e]" aria-label="Adicionar jogo à coleção">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#d9f36a] text-[#17382e] shadow-md"><Plus className="h-5 w-5" /></span>
        <span>Adicionar</span>
      </button>;

  const modal = open && typeof document !== "undefined"
    ? createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <section role="dialog" aria-modal="true" aria-labelledby="quick-add-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#f7f3ea] shadow-2xl sm:max-w-2xl sm:rounded-3xl">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#ded8cb] bg-[#f7f3ea]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
            <div>
              <p className="eyebrow">ADICIONAR JOGO</p>
              <h2 id="quick-add-title" className="mt-1 text-xl font-black text-slate-950">
                {manualMode ? "Adicionar manualmente" : selected ? "Confirmar a tua cópia" : "Encontrar no catálogo"}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {manualMode
                  ? "Usa este modo apenas quando o jogo não existir no catálogo."
                  : selected
                    ? "Identidade primeiro; depois confirma o que tens fisicamente."
                    : "Pesquisa por nome ou por um IGDB ID. Nada é escolhido automaticamente."}
              </p>
            </div>
            <button type="button" onClick={close} aria-label="Fechar" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ded8cb] bg-white text-slate-500 hover:text-slate-950"><X className="h-4 w-4" /></button>
          </div>

          {manualMode
            ? <ManualAddForm
                platforms={allPlatforms}
                platformListId={platformListId}
                completenessListId={completenessListId}
                titleRef={manualTitleRef}
                onBack={() => setManualMode(false)}
              />
            : selected
              ? <CanonicalAddForm
                  candidate={selected}
                  sealed={sealed}
                  setSealed={setSealed}
                  onBack={() => { setSelected(null); setSealed("no"); }}
                />
              : <div className="p-5 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                    <label>
                      <span className="field-label">Jogo ou IGDB ID</span>
                      <span className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d7d2c6] bg-white px-3">
                        <Search className="h-4 w-4 shrink-0 text-slate-400" />
                        <input
                          ref={searchRef}
                          type="search"
                          value={query}
                          onChange={(event) => {
                            const value = event.target.value;
                            setQuery(value);
                            if (!isSearchableQuery(value)) {
                              setResults([]);
                              setSearchState("idle");
                              setSearchError("");
                            }
                          }}
                          autoComplete="off"
                          spellCheck={false}
                          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                          placeholder="Ex.: Silent Hill 2 ou IGDB: 1074"
                        />
                      </span>
                    </label>
                    <label>
                      <span className="field-label">Consola</span>
                      <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} className="field-input">
                        <option value="">Todas</option>
                        {allPlatforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-[#ded8cb] bg-white">
                    {searchState === "idle" && <p className="p-5 text-sm font-semibold text-slate-500">Escreve pelo menos dois caracteres, ou um IGDB ID.</p>}
                    {searchState === "loading" && <p className="p-5 text-sm font-semibold text-slate-500">A procurar no catálogo…</p>}
                    {searchState === "error" && <div className="flex gap-3 p-5 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{searchError}</span></div>}
                    {searchState === "loaded" && results.length === 0 && <p className="p-5 text-sm font-semibold text-slate-500">Nenhum resultado seguro. Tenta outro nome, filtra por consola ou usa o modo manual.</p>}
                    {results.map((candidate) => <button
                      key={`${candidate.gameId}:${candidate.platformId}`}
                      type="button"
                      onClick={() => setSelected(candidate)}
                      className="grid w-full grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 p-3 text-left last:border-b-0 hover:bg-emerald-50/60"
                    >
                      <CatalogCover candidate={candidate} />
                      <span className="min-w-0">
                        <strong className="block truncate text-sm font-black text-slate-950">{candidate.title}</strong>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                          {candidate.platform} · {candidate.edition}{candidate.firstReleaseDate ? ` · ${candidate.firstReleaseDate.slice(0, 4)}` : ""}
                        </span>
                        {candidate.genres.length > 0 && <span className="mt-1 block truncate text-[11px] text-slate-400">{candidate.genres.slice(0, 3).join(" · ")}</span>}
                        <CatalogLibraryBadges candidate={candidate} className="mt-1.5" />
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wide text-[#315b47]">Escolher</span>
                    </button>)}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Database className="h-3.5 w-3.5" />Identidade e metadata: IGDB</p>
                    <button type="button" onClick={() => setManualMode(true)} className="text-xs font-black text-slate-600 underline underline-offset-2 hover:text-slate-950">
                      Não encontro o jogo — adicionar manualmente
                    </button>
                  </div>
                </div>}
        </section>
      </div>,
      document.body,
    )
    : null;

  return <>{triggerButton}{modal}</>;
}

function CatalogLibraryBadges({ candidate, className = "" }: { candidate: CatalogSearchCandidate; className?: string }) {
  const state = candidate.libraryState;
  if (!state?.badges.length) return null;
  return <span className={`flex flex-wrap gap-1 ${className}`}>
    {state.badges.map((badge) => <CatalogLibraryBadgePill key={badge} badge={badge} ownedCount={state.ownedCount} />)}
  </span>;
}

function CatalogLibraryBadgePill({ badge, ownedCount }: { badge: CatalogLibraryBadge; ownedCount: number }) {
  const config = badge === "owned"
    ? { label: ownedCount > 1 ? `Já tens · ${ownedCount} cópias` : "Já tens", className: "bg-emerald-100 text-emerald-800" }
    : badge === "wishlist"
      ? { label: "Na wishlist", className: "bg-rose-100 text-rose-800" }
      : { label: "Encomendado", className: "bg-amber-100 text-amber-900" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${config.className}`}>{config.label}</span>;
}

function CatalogCover({ candidate }: { candidate: CanonicalGameCandidate }) {
  return candidate.coverUrl
    ? <img src={candidate.coverUrl} alt="" className="h-[68px] w-[50px] rounded-lg bg-slate-100 object-contain" />
    : <span className="grid h-[68px] w-[50px] place-items-center rounded-lg bg-slate-100 text-[9px] font-black text-slate-400">SEM CAPA</span>;
}

function CanonicalAddForm({
  candidate,
  sealed,
  setSealed,
  onBack,
}: {
  candidate: CatalogSearchCandidate;
  sealed: string;
  setSealed: (value: string) => void;
  onBack: () => void;
}) {
  const profile = physicalCopyProfile(candidate.platform);

  return <form action={addCollectionGame} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
    <input type="hidden" name="manualMode" value="0" />
    <input type="hidden" name="catalogGameId" value={candidate.gameId} />
    <input type="hidden" name="catalogPlatformId" value={candidate.platformId} />

    <div className="sm:col-span-2 flex items-start gap-3 rounded-2xl border border-[#d7d2c6] bg-white p-3">
      <CatalogCover candidate={candidate} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#466558]">IDENTIDADE SELECIONADA · IGDB #{candidate.gameId}</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">{candidate.title}</h3>
        <p className="text-xs font-semibold text-slate-500">{candidate.platform}{candidate.firstReleaseDate ? ` · ${candidate.firstReleaseDate.slice(0, 4)}` : ""}</p>
        <CatalogLibraryBadges candidate={candidate} className="mt-2" />
      </div>
      <button type="button" onClick={onBack} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl border border-[#ded8cb] px-3 text-xs font-black text-slate-600"><ChevronLeft className="h-3.5 w-3.5" />Trocar</button>
    </div>

    <label>
      <span className="field-label">Edição</span>
      <input name="edition" defaultValue={candidate.edition} className="field-input" />
      <span className="mt-1 block text-[10px] leading-4 text-slate-400">Se alterares a edição, a capa do catálogo fica por confirmar.</span>
    </label>
    <CollectionSelectField name="region" label="Região" options={REGION_OPTIONS} defaultValue="PAL" />
    <CollectionSelectField name="language" label="Idioma" options={LANGUAGE_OPTIONS} defaultValue="English" />
    <CollectionSelectField name="conditionGrade" label="Condição geral" options={CONDITION_OPTIONS} />

    <fieldset className="rounded-2xl border border-[#ded8cb] bg-white/80 p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-black text-slate-900">O que tens desta cópia?</legend>
      <p className="mt-1 text-xs leading-5 text-slate-500">{profile.note}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="field-label">Está selado?</span>
          <select name="sealed" value={sealed} onChange={(event) => setSealed(event.target.value)} className="field-input">
            <option value="no">Não</option>
            <option value="yes">Sim</option>
          </select>
        </label>
        {sealed !== "yes" && profile.components.map((component) => <ComponentStateField key={component.key} componentKey={component.key} label={component.label} />)}
      </div>
      {candidate.edition !== "Standard" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">Esta parece ser uma edição específica. O IGDB não descreve de forma fiável todos os inserts/extras físicos; confirma esses componentes depois em vez de os inventarmos.</p>}
    </fieldset>

    <label>
      <span className="field-label">Preço pago (€)</span>
      <input name="paid" type="number" min="0" step="0.01" inputMode="decimal" className="field-input" placeholder="Opcional" />
    </label>
    <Field name="purchaseDate" label="Data de compra" type="date" />

    <details className="rounded-2xl border border-[#ded8cb] bg-white/75 p-4 sm:col-span-2">
      <summary className="cursor-pointer text-sm font-black text-slate-800">Compra e notas</summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field name="source" label="Onde comprei" placeholder="Feira, Vinted, CeX…" />
        <Field name="seller" label="Vendedor" />
        <label className="sm:col-span-2"><span className="field-label">Link do anúncio</span><input name="listingUrl" type="url" className="field-input" /></label>
        <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20" /></label>
      </div>
    </details>

    <div className="flex gap-2 sm:col-span-2 sm:justify-end">
      <button type="button" onClick={onBack} className="min-h-11 flex-1 rounded-xl border border-[#d7d2c6] bg-white px-4 text-sm font-black text-slate-600 sm:flex-none">Voltar</button>
      <ActionSubmitButton pendingLabel="A adicionar…" className="min-h-11 flex-[2] rounded-xl bg-[#17382e] px-5 text-sm font-black text-white sm:flex-none">Adicionar à coleção</ActionSubmitButton>
    </div>
  </form>;
}

function ComponentStateField({ componentKey, label }: { componentKey: PhysicalComponentKey; label: string }) {
  return <label>
    <span className="field-label">{label}</span>
    <select name={`component_${componentKey}`} defaultValue="unknown" className="field-input">
      <option value="yes">Tenho</option>
      <option value="no">Falta</option>
      <option value="unknown">Verificar depois</option>
    </select>
  </label>;
}

function ManualAddForm({
  platforms,
  platformListId,
  completenessListId,
  titleRef,
  onBack,
}: {
  platforms: string[];
  platformListId: string;
  completenessListId: string;
  titleRef: RefObject<HTMLInputElement | null>;
  onBack: () => void;
}) {
  return <form action={addCollectionGame} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
    <input type="hidden" name="manualMode" value="1" />
    <div className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
      O modo manual é uma saída de emergência. O registo fica marcado como identidade manual e pode precisar de revisão/artwork mais tarde.
    </div>
    <label className="sm:col-span-2">
      <span className="field-label">Jogo</span>
      <input ref={titleRef} name="title" required autoComplete="off" className="field-input" />
    </label>
    <label>
      <span className="field-label">Consola</span>
      <input name="platform" required list={platformListId} autoComplete="off" className="field-input" />
      <datalist id={platformListId}>{platforms.map((platform) => <option key={platform} value={platform} />)}</datalist>
    </label>
    <label>
      <span className="field-label">Preço pago (€)</span>
      <input name="paid" type="number" min="0" step="0.01" inputMode="decimal" className="field-input" placeholder="Opcional" />
    </label>
    <label>
      <span className="field-label">Completude</span>
      <input name="overallStatus" list={completenessListId} autoComplete="off" className="field-input" placeholder="CIB / Loose / Sealed" />
      <datalist id={completenessListId}><option value="CIB" /><option value="Loose" /><option value="Sealed" /><option value="Incomplete" /></datalist>
    </label>
    <CollectionSelectField name="conditionGrade" label="Condição" options={CONDITION_OPTIONS} />
    <CollectionSelectField name="region" label="Região" options={REGION_OPTIONS} defaultValue="PAL" />
    <Field name="edition" label="Edição" placeholder="Standard" />
    <CollectionSelectField name="language" label="Idioma" options={LANGUAGE_OPTIONS} defaultValue="English" />
    <Field name="source" label="Onde comprei" />
    <Field name="purchaseDate" label="Data de compra" type="date" />
    <Field name="seller" label="Vendedor" />
    <label className="sm:col-span-2"><span className="field-label">Link do anúncio</span><input name="listingUrl" type="url" className="field-input" /></label>
    <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20" /></label>
    <div className="flex gap-2 sm:col-span-2 sm:justify-end">
      <button type="button" onClick={onBack} className="min-h-11 flex-1 rounded-xl border border-[#d7d2c6] bg-white px-4 text-sm font-black text-slate-600 sm:flex-none">Voltar ao catálogo</button>
      <ActionSubmitButton pendingLabel="A adicionar…" className="min-h-11 flex-[2] rounded-xl bg-[#17382e] px-5 text-sm font-black text-white sm:flex-none">Adicionar manualmente</ActionSubmitButton>
    </div>
  </form>;
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return <label><span className="field-label">{label}</span><input name={name} type={type} placeholder={placeholder} className="field-input" /></label>;
}
