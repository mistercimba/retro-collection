"use client";

import { AlertTriangle, ChevronLeft, Database, Heart, PackageCheck, Plus, Search, ShoppingBag, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { CollectionSelectField } from "@/components/collection-select-field";
import { CONDITION_OPTIONS, LANGUAGE_OPTIONS, REGION_OPTIONS } from "@/lib/collection-field-options";
import { addCollectionGame, addWishlistGame, purchaseWishlistGame } from "@/lib/library-actions";
import {
  CATALOG_PLATFORMS,
  type CanonicalGameCandidate,
} from "@/lib/igdb-catalog.logic";
import type { CatalogLibraryBadge, CatalogLibraryState } from "@/lib/catalog-library-state.logic";
import { wrappingDialogFocusIndex } from "@/lib/dialog-focus.logic";
import { physicalCopyProfile, type PhysicalComponentKey } from "@/lib/physical-copy-profile.logic";

type SearchState = "idle" | "loading" | "loaded" | "error";
type AddIntent = "owned" | "ordered" | "wishlist";
type CatalogSearchCandidate = CanonicalGameCandidate & { libraryState?: CatalogLibraryState };
type PrefilledWishlistTarget = {
  targetId: string;
  title: string;
  platform: string;
  targetVersion?: string;
  priority?: string;
};

function isSearchableQuery(value: string) {
  const trimmed = value.trim();
  const idLike = /^(?:igdb\s*[:#-]?\s*)?#?\d{1,9}$/i.test(trimmed);
  return trimmed.length <= 120 && (idLike || trimmed.length >= 2);
}

export function QuickAddDialog({
  platforms,
  trigger,
  prefillWishlist,
}: {
  platforms: string[];
  trigger: "sidebar" | "mobile" | "wishlist" | "wishlist-add";
  prefillWishlist?: PrefilledWishlistTarget;
}) {
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [results, setResults] = useState<CatalogSearchCandidate[]>([]);
  const [selected, setSelected] = useState<CatalogSearchCandidate | null>(null);
  const [intent, setIntent] = useState<AddIntent | null>(null);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchError, setSearchError] = useState("");
  const [moreCatalogResults, setMoreCatalogResults] = useState(false);
  const [sealed, setSealed] = useState("no");
  const searchRef = useRef<HTMLInputElement>(null);
  // Invalidate late responses synchronously on each query, platform or flow change.
  const searchSequenceRef = useRef(0);
  const manualTitleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const platformListId = useMemo(() => "quick-add-platform-" + trigger, [trigger]);
  const completenessListId = useMemo(() => "quick-add-completeness-" + trigger, [trigger]);
  const allPlatforms = useMemo(
    () => [...new Set([...CATALOG_PLATFORMS, ...platforms])].sort((a, b) => a.localeCompare(b, "pt-PT")),
    [platforms],
  );

  // Keep one modal lifecycle for body scroll locking, keyboard containment
  // and focus restoration. Changing steps must not reset the focus origin.
  useEffect(() => {
    if (!open) return;
    const returnFocusTo = document.activeElement instanceof HTMLElement
      ? document.activeElement : triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0);
      const index = focusable.indexOf(document.activeElement as HTMLElement);
      const next = wrappingDialogFocusIndex(focusable.length, index, event.shiftKey);
      if (next === null) return;
      event.preventDefault();
      (next < 0 ? dialog : focusable[next])?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (returnFocusTo?.isConnected) returnFocusTo.focus();
      else triggerRef.current?.focus();
    };
  }, [open]);

  // Move focus to the active step, including the prefilled purchase form.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (manualMode) manualTitleRef.current?.focus();
      else if (!prefillWishlist && !selected) searchRef.current?.focus();
      else dialogRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, manualMode, prefillWishlist, selected, intent]);

  useEffect(() => {
    if (!open || prefillWishlist || manualMode || selected) return;
    const trimmed = query.trim();
    if (!isSearchableQuery(trimmed)) return;

    const controller = new AbortController();
    const requestSequence = ++searchSequenceRef.current;
    const timer = window.setTimeout(() => {
      if (controller.signal.aborted || requestSequence !== searchSequenceRef.current) return;
      setSearchState("loading");
      setSearchError("");
      setResults([]);
      setMoreCatalogResults(false);
      const params = new URLSearchParams({ q: trimmed });
      if (platformFilter) params.set("platform", platformFilter);
      fetch("/api/catalog/search?" + params.toString(), { signal: controller.signal, cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload?.error || "Pesquisa indisponível.");
          if (controller.signal.aborted || requestSequence !== searchSequenceRef.current) return;
          setResults(Array.isArray(payload?.results) ? payload.results : []);
          setMoreCatalogResults(payload?.truncated === true);
          setSearchState("loaded");
        })
        .catch((error) => {
          if (controller.signal.aborted || requestSequence !== searchSequenceRef.current) return;
          setResults([]);
          setMoreCatalogResults(false);
          setSearchState("error");
          setSearchError(error instanceof Error ? error.message : "Pesquisa indisponível.");
        });
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, prefillWishlist, manualMode, selected, query, platformFilter]);

  const resetFlow = () => {
    searchSequenceRef.current += 1;
    setManualMode(false);
    setQuery("");
    setPlatformFilter("");
    setResults([]);
    setMoreCatalogResults(false);
    setSelected(null);
    setIntent(null);
    setSearchState("idle");
    setSearchError("");
    setSealed("no");
  };

  const close = () => {
    setOpen(false);
    resetFlow();
  };

  const openDialog = () => {
    resetFlow();
    if (prefillWishlist) {
      setIntent("ordered");
      setQuery(prefillWishlist.title);
      setPlatformFilter(prefillWishlist.platform);
    }
    setOpen(true);
  };

  const triggerButton = trigger === "sidebar"
    ? <button ref={triggerRef} type="button" onClick={openDialog} className="side-nav-link side-nav-action w-full text-left">
        <Plus className="h-5 w-5" /><span>Adicionar jogo</span>
      </button>
    : trigger === "mobile"
      ? <button ref={triggerRef} type="button" onClick={openDialog} className="mobile-nav-link text-[#17382e]" aria-label="Adicionar jogo">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#d9f36a] text-[#17382e] shadow-md"><Plus className="h-5 w-5" /></span>
          <span>Adicionar</span>
        </button>
      : trigger === "wishlist-add"
        ? <button ref={triggerRef} type="button" onClick={openDialog} className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-black text-white">
            + Adicionar jogo à wishlist
          </button>
        : <button ref={triggerRef} type="button" onClick={openDialog} className="min-h-11 w-full rounded-xl bg-emerald-900 px-4 text-sm font-black text-white">
            Comprei este jogo
          </button>;

  const title = prefillWishlist
    ? "Registar compra"
    : manualMode
      ? "Adicionar manualmente"
      : selected && !intent
        ? "O que queres fazer?"
        : selected && intent === "owned"
          ? "Já tenho esta cópia"
          : selected && intent === "ordered"
            ? "Comprado / a caminho"
            : selected && intent === "wishlist"
              ? "Adicionar à wishlist"
              : "Encontrar no catálogo";

  const subtitle = prefillWishlist
    ? "Os dados do jogo já vêm da Wishlist. Só tens de registar a compra."
    : manualMode
      ? "Fallback para quando o jogo não existe no catálogo. Este modo adiciona uma cópia que já tens."
      : selected && !intent
        ? "Escolhe o estado real do jogo antes de continuar."
        : selected && intent === "owned"
          ? "Confirma a cópia física que já tens contigo."
          : selected && intent === "ordered"
            ? "Regista a compra agora; a verificação física fica para quando chegar."
            : selected && intent === "wishlist"
              ? "Guarda-o como alvo de compra, sem fingir que já foi comprado."
              : "Pesquisa no IGDB por nome ou ID. Só aparecem jogos com lançamento europeu confirmado na consola escolhida; a embalagem PAL específica não fica automaticamente verificada.";

  const modal = open && typeof document !== "undefined"
    ? createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="quick-add-title" className="max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-[#f7f3ea] pb-[env(safe-area-inset-bottom)] shadow-2xl focus:outline-none sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:rounded-3xl">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#ded8cb] bg-[#f7f3ea]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
            <div>
              <p className="eyebrow">ADICIONAR JOGO</p>
              <h2 id="quick-add-title" className="mt-1 text-xl font-black text-slate-950">{title}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
            </div>
            <button type="button" onClick={close} aria-label="Fechar" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ded8cb] bg-white text-slate-500 hover:text-slate-950"><X className="h-4 w-4" /></button>
          </div>

          {prefillWishlist
            ? <PurchaseForm
                target={prefillWishlist}
                onBack={close}
              />
            : manualMode
              ? <ManualAddForm
                  platforms={allPlatforms}
                  platformListId={platformListId}
                  completenessListId={completenessListId}
                  titleRef={manualTitleRef}
                  onBack={() => setManualMode(false)}
                />
              : selected
                ? intent === null
                  ? <IntentChoice
                      candidate={selected}
                      onChoose={setIntent}
                      onChangeGame={() => { setSelected(null); setIntent(null); setSealed("no"); }}
                    />
                  : intent === "owned"
                    ? <CanonicalAddForm
                        candidate={selected}
                        sealed={sealed}
                        setSealed={setSealed}
                        onBack={() => { setIntent(null); setSealed("no"); }}
                      />
                    : intent === "ordered"
                      ? <PurchaseForm candidate={selected} onBack={() => setIntent(null)} />
                      : <WishlistForm candidate={selected} onBack={() => setIntent(null)} />
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
                              searchSequenceRef.current += 1;
                              setQuery(value);
                              // Search cards from a previous term must not remain
                              // clickable during debounce and a new request.
                              setResults([]);
                              setMoreCatalogResults(false);
                              setSearchError("");
                              setSearchState(isSearchableQuery(value) ? "loading" : "idle");
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
                        <select
                          value={platformFilter}
                          onChange={(event) => {
                            searchSequenceRef.current += 1;
                            setPlatformFilter(event.target.value);
                            setResults([]);
                            setMoreCatalogResults(false);
                            setSearchError("");
                            setSearchState(isSearchableQuery(query) ? "loading" : "idle");
                          }}
                          className="field-input"
                        >
                          <option value="">Todas as consolas</option>
                          {allPlatforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-[#ded8cb] bg-white">
                      {searchState === "idle" && <p className="p-5 text-sm font-semibold text-slate-500">Escreve pelo menos dois caracteres, ou um IGDB ID.</p>}
                      {searchState === "loading" && <p className="p-5 text-sm font-semibold text-slate-500">A procurar no catálogo…</p>}
                      {searchState === "error" && <div className="flex gap-3 p-5 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{searchError}</span></div>}
                      {searchState === "loaded" && results.length === 0 && <p className="p-5 text-sm font-semibold text-slate-500">Nenhum lançamento europeu confirmado para esta pesquisa e consola no IGDB. Experimenta outro nome ou escolhe a consola; para uma cópia física não indexada, usa o modo manual.</p>}
                      {searchState === "loaded" && moreCatalogResults && <p role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">Há mais correspondências do que as 24 apresentadas. Escreve mais palavras ou escolhe uma consola para afinar; esta pesquisa não é uma lista completa do catálogo.</p>}
                      {searchState === "loaded" && results.map((candidate) => <button
                        key={String(candidate.gameId) + ":" + String(candidate.platformId)}
                        type="button"
                        onClick={() => { setSelected(candidate); setIntent(trigger === "wishlist-add" ? "wishlist" : null); }}
                        className="grid w-full grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 p-3 text-left last:border-b-0 hover:bg-emerald-50/60"
                      >
                        <CatalogCover candidate={candidate} />
                        <span className="min-w-0">
                          <strong className="block truncate text-sm font-black text-slate-950">{candidate.title}</strong>
                          <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                            {candidate.platform} · {candidate.edition}{candidate.europeanReleaseDate ? " · Europa " + candidate.europeanReleaseDate.slice(0, 4) : " · lançamento europeu confirmado"}
                          </span>
                          {candidate.genres.length > 0 && <span className="mt-1 block truncate text-[11px] text-slate-400">{candidate.genres.slice(0, 3).join(" · ")}</span>}
                          <CatalogLibraryBadges candidate={candidate} className="mt-1.5" />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wide text-[#315b47]">Escolher</span>
                      </button>)}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Database className="h-3.5 w-3.5" />Identidade e metadata: IGDB</p>
                      {trigger !== "wishlist-add" && <button type="button" onClick={() => setManualMode(true)} className="text-xs font-black text-slate-600 underline underline-offset-2 hover:text-slate-950">
                        Não encontro o jogo — adicionar manualmente
                      </button>}
                    </div>
                  </div>}
        </section>
      </div>,
      document.body,
    )
    : null;

  return <>{triggerButton}{modal}</>;
}

function IntentChoice({
  candidate,
  onChoose,
  onChangeGame,
}: {
  candidate: CatalogSearchCandidate;
  onChoose: (intent: AddIntent) => void;
  onChangeGame: () => void;
}) {
  return <div className="p-5 sm:p-6">
    <SelectedIdentity candidate={candidate} />
    <div className="mt-4 grid gap-3">
      <IntentButton
        icon={<PackageCheck className="h-5 w-5" />}
        title="Já tenho o jogo comigo"
        description="Já chegou e podes confirmar agora a condição e os componentes físicos."
        onClick={() => onChoose("owned")}
      />
      <IntentButton
        icon={<ShoppingBag className="h-5 w-5" />}
        title="Já comprei, mas ainda não chegou"
        description="Fica como A caminho. Não conta como coleção até confirmares a receção."
        onClick={() => onChoose("ordered")}
      />
      <IntentButton
        icon={<Heart className="h-5 w-5" />}
        title="Quero comprar"
        description="Adiciona à Wishlist como alvo ativo de compra."
        onClick={() => onChoose("wishlist")}
      />
    </div>
    <button type="button" onClick={onChangeGame} className="mt-4 inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#ded8cb] bg-white px-3 text-xs font-black text-slate-600">
      <ChevronLeft className="h-3.5 w-3.5" />Trocar jogo
    </button>
  </div>;
}

function IntentButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return <button type="button" onClick={onClick} className="flex items-start gap-3 rounded-2xl border border-[#ded8cb] bg-white p-4 text-left hover:border-[#a8b7aa] hover:bg-emerald-50/50">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5eadf] text-[#17382e]">{icon}</span>
    <span><strong className="block text-sm font-black text-slate-950">{title}</strong><span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{description}</span></span>
  </button>;
}

function SelectedIdentity({ candidate }: { candidate: CatalogSearchCandidate }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-[#d7d2c6] bg-white p-3">
    <CatalogCover candidate={candidate} />
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#466558]">IDENTIDADE SELECIONADA · IGDB #{candidate.gameId}</p>
      <h3 className="mt-1 text-lg font-black text-slate-950">{candidate.title}</h3>
      <p className="text-xs font-semibold text-slate-500">{candidate.platform}{candidate.europeanReleaseDate ? " · Europa " + candidate.europeanReleaseDate.slice(0, 4) : " · lançamento europeu confirmado"}</p>
      <CatalogLibraryBadges candidate={candidate} className="mt-2" />
    </div>
  </div>;
}

function PurchaseForm({
  candidate,
  target,
  onBack,
}: {
  candidate?: CatalogSearchCandidate;
  target?: PrefilledWishlistTarget;
  onBack: () => void;
}) {
  const title = target?.title ?? candidate?.title ?? "";
  const platform = target?.platform ?? candidate?.platform ?? "";
  const today = new Date().toISOString().slice(0, 10);

  return <form action={purchaseWishlistGame} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
    {candidate && <>
      <input type="hidden" name="catalogGameId" value={candidate.gameId} />
      <input type="hidden" name="catalogPlatformId" value={candidate.platformId} />
      <input type="hidden" name="region" value="PAL" />
      <input type="hidden" name="targetVersion" value={"PAL · " + candidate.edition} />
      <input type="hidden" name="priority" value="Média" />
      <div className="sm:col-span-2"><SelectedIdentity candidate={candidate} /></div>
    </>}
    {target && <div className="sm:col-span-2 rounded-2xl border border-[#d7d2c6] bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#466558]">JOGO DA WISHLIST</p>
      <h3 className="mt-1 text-lg font-black text-slate-950">{target.title}</h3>
      <p className="text-xs font-semibold text-slate-500">{target.platform}{target.targetVersion ? " · " + target.targetVersion : ""}</p>
    </div>}
    <input type="hidden" name="targetId" value={target?.targetId ?? ""} />
    <input type="hidden" name="title" value={title} />
    <input type="hidden" name="platform" value={platform} />

    <label>
      <span className="field-label">Preço pago (€)</span>
      <input name="paid" type="number" min="0" step="0.01" inputMode="decimal" className="field-input" placeholder="Opcional" />
    </label>
    <Field name="purchaseDate" label="Data de compra" type="date" defaultValue={today} />
    <Field name="source" label="Onde comprei" placeholder="Feira, Vinted, CeX…" />
    <Field name="seller" label="Vendedor" />
    <label className="sm:col-span-2"><span className="field-label">Link do anúncio</span><input name="listingUrl" type="url" className="field-input" /></label>
    <label className="sm:col-span-2"><span className="field-label">Notas da compra</span><textarea name="purchaseNotes" className="field-input min-h-20" /></label>
    <p className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">Fica como <strong>A caminho</strong>. Não entra na coleção nem conta como cópia tua até confirmares que chegou.</p>

    <div className="flex gap-2 sm:col-span-2 sm:justify-end">
      <button type="button" onClick={onBack} className="min-h-11 flex-1 rounded-xl border border-[#d7d2c6] bg-white px-4 text-sm font-black text-slate-600 sm:flex-none">Voltar</button>
      <ActionSubmitButton pendingLabel="A registar compra…" className="min-h-11 flex-[2] rounded-xl bg-amber-800 px-5 text-sm font-black text-white sm:flex-none">Marcar como comprado / a caminho</ActionSubmitButton>
    </div>
  </form>;
}

function WishlistForm({ candidate, onBack }: { candidate: CatalogSearchCandidate; onBack: () => void }) {
  return <form action={addWishlistGame} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
    <input type="hidden" name="catalogGameId" value={candidate.gameId} />
    <input type="hidden" name="catalogPlatformId" value={candidate.platformId} />
    <input type="hidden" name="title" value={candidate.title} />
    <input type="hidden" name="platform" value={candidate.platform} />
    <input type="hidden" name="region" value="PAL" />
    <div className="sm:col-span-2"><SelectedIdentity candidate={candidate} /></div>

    <label>
      <span className="field-label">Prioridade</span>
      <select name="priority" defaultValue="Média" className="field-input"><option>Alta</option><option>Média</option><option>Baixa</option><option>Grail</option></select>
    </label>
    <Field name="priceCeilingEur" label="Referência manual (€)" type="number" step="0.01" />
    <Field name="targetVersion" label="Versão alvo" defaultValue={"PAL · " + candidate.edition} />
    <Field name="reason" label="Porque quero" />
    <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20" /></label>

    <div className="flex gap-2 sm:col-span-2 sm:justify-end">
      <button type="button" onClick={onBack} className="min-h-11 flex-1 rounded-xl border border-[#d7d2c6] bg-white px-4 text-sm font-black text-slate-600 sm:flex-none">Voltar</button>
      <ActionSubmitButton pendingLabel="A adicionar à wishlist…" className="min-h-11 flex-[2] rounded-xl bg-rose-700 px-5 text-sm font-black text-white sm:flex-none">Adicionar à wishlist</ActionSubmitButton>
    </div>
  </form>;
}

function CatalogLibraryBadges({ candidate, className = "" }: { candidate: CatalogSearchCandidate; className?: string }) {
  const state = candidate.libraryState;
  if (!state?.badges.length) return null;
  return <span className={"flex flex-wrap gap-1 " + className}>
    {state.badges.map((badge) => <CatalogLibraryBadgePill key={badge} badge={badge} ownedCount={state.ownedCount} />)}
  </span>;
}

function CatalogLibraryBadgePill({ badge, ownedCount }: { badge: CatalogLibraryBadge; ownedCount: number }) {
  const config = badge === "owned"
    ? { label: ownedCount > 1 ? "Já tens · " + ownedCount + " cópias" : "Já tens", className: "bg-emerald-100 text-emerald-800" }
    : badge === "wishlist"
      ? { label: "Na wishlist", className: "bg-rose-100 text-rose-800" }
      : { label: "Encomendado", className: "bg-amber-100 text-amber-900" };
  return <span className={"rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide " + config.className}>{config.label}</span>;
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

    <div className="sm:col-span-2"><SelectedIdentity candidate={candidate} /></div>

    <label>
      <span className="field-label">Edição</span>
      <input name="edition" defaultValue={candidate.edition} className="field-input" />
      <span className="mt-1 block text-[10px] leading-4 text-slate-400">Descreve a embalagem real, se for diferente. O IGDB não enumera todas as variantes físicas; se alterares a edição, a capa fica por confirmar.</span>
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
      <label className="mt-3 block">
        <span className="field-label">Extras / acessórios que tens (opcional)</span>
        <input name="extras" className="field-input" placeholder="Ex.: Pokéwalker incluído, com caixa" />
        <span className="mt-1 block text-[10px] leading-4 text-slate-500">Só regista o que verificaste na tua cópia. Não assumimos que esteja incluído por ser desta edição.</span>
      </label>
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
    <select name={"component_" + componentKey} defaultValue="unknown" className="field-input">
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
      O modo manual é uma saída de emergência para uma cópia que já tens fisicamente. Para Wishlist / A caminho usa um jogo identificado no catálogo.
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
    <Field name="extras" label="Extras / acessórios presentes" placeholder="Ex.: Pokéwalker, poster…" />
    <CollectionSelectField name="language" label="Idioma" options={LANGUAGE_OPTIONS} defaultValue="English" />
    <Field name="source" label="Onde comprei" />
    <Field name="purchaseDate" label="Data de compra" type="date" />
    <Field name="seller" label="Vendedor" />
    <label className="sm:col-span-2"><span className="field-label">Link do anúncio</span><input name="listingUrl" type="url" className="field-input" /></label>
    <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20" /></label>
    <div className="flex gap-2 sm:col-span-2 sm:justify-end">
      <button type="button" onClick={onBack} className="min-h-11 flex-1 rounded-xl border border-[#d7d2c6] bg-white px-4 text-sm font-black text-slate-600 sm:flex-none">Voltar ao catálogo</button>
      <ActionSubmitButton pendingLabel="A adicionar…" className="min-h-11 flex-[2] rounded-xl bg-[#17382e] px-5 text-sm font-black text-white sm:flex-none">Adicionar à coleção</ActionSubmitButton>
    </div>
  </form>;
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  step?: string;
}) {
  return <label><span className="field-label">{label}</span><input name={name} type={type} step={step} placeholder={placeholder} defaultValue={defaultValue} className="field-input" /></label>;
}
