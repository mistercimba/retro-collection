import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { WishlistArtwork } from "@/components/wishlist-artwork";
import { WishlistBuyReferencePanel } from "@/components/wishlist-buy-reference-panel";
import { ReferenceLinks } from "@/components/reference-links";
import { cancelWishlistPurchase, editWishlistGame, receiveWishlistPurchase, removeWishlistGame } from "@/lib/library-actions";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { getWantlist } from "@/lib/data/collection-service";
import { displayPlatform, platformSlug } from "@/lib/data/platforms";
import { findGameMetadataByTitle } from "@/lib/game-metadata";
import { getPricechartingGuide, getPricechartingGuides } from "@/lib/pricecharting-catalog";
import { getCexWishlistGuide, getCexWishlistGuides } from "@/lib/cex-catalog";
import { buildWishlistBuyReferenceGuide } from "@/lib/wishlist-buy-reference.logic";
import { getSafeListReturnPath } from "@/lib/list-url-state.logic";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { CollectionSelectField } from "@/components/collection-select-field";
import { CONDITION_OPTIONS, LANGUAGE_OPTIONS, REGION_OPTIONS } from "@/lib/collection-field-options";
import { resolveWishlistArtwork } from "@/lib/wishlist-artwork";
import { filterWishlistItems, getWishlistNeighbors, getWishlistOriginState, selectWishlistItems, wishlistPriceKey } from "@/lib/wishlist-price.logic";
import { isOrderedWishlistTarget } from "@/lib/wishlist-acquisition.logic";
import { physicalCopyProfile, type PhysicalComponentKey } from "@/lib/physical-copy-profile.logic";
import { formatEuro } from "@/lib/format";

export default async function WishDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ targetId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ targetId }, query, targets] = await Promise.all([params, searchParams, getWantlist()]);
  const decodedId = decodeURIComponent(targetId);
  const wantedPlatform = typeof query.platform === "string" ? query.platform : "";
  const wantedTitle = typeof query.title === "string" ? query.title : "";
  const target = targets.find((item) =>
    item.targetId === decodedId &&
    (!wantedPlatform || item.platform === wantedPlatform) &&
    (!wantedTitle || item.title === wantedTitle)
  ) ?? targets.find((item) => item.targetId === decodedId);
  if (!target) notFound();

  const ordered = isOrderedWishlistTarget(target);
  const [guide, cexGuide] = await Promise.all([
    getPricechartingGuide(target.platform, target.title, target.targetVersion),
    getCexWishlistGuide(target.platform, target.title, target.targetVersion),
  ]);
  const metadata = findGameMetadataByTitle(target.title);
  const artworkSrc = resolveWishlistArtwork(target);
  const back = getSafeListReturnPath(query.from) ?? (ordered ? "/want" : "/platform/" + platformSlug(target.platform) + "?tab=wishlist");
  const year = metadata?.firstReleaseDate ? metadata.firstReleaseDate.slice(0, 4) : "—";
  const origin = ordered ? null : getWishlistOriginState(query.from, platformSlug(target.platform));
  const state = origin ?? { tab: "wishlist" as const, q: "", filter: "all", condition: "all", reference: "all", sort: "title" };
  const candidates = ordered
    ? []
    : filterWishlistItems(targets.filter((item) => item.platform === target.platform && item.planState !== "inactive" && item.matchState !== "acquired"), state);
  const needsBuyReferences = Boolean(origin && (origin.reference !== "all" || origin.sort === "buy-desc"));
  const siblingEntries = candidates.map((item) => ({
    key: wishlistPriceKey(item),
    platform: item.platform,
    title: item.title,
    edition: item.targetVersion,
  }));
  const [siblingPriceGuides, siblingCexGuides] = needsBuyReferences
    ? await Promise.all([getPricechartingGuides(siblingEntries), getCexWishlistGuides(siblingEntries)])
    : [new Map(), new Map()];
  const siblingBuyReferences = needsBuyReferences
    ? Object.fromEntries(siblingEntries.map((entry) => {
        const price = siblingPriceGuides.get(entry.key) ?? { looseEur: null, cibEur: null, newEur: null, source: "Preço indisponível", date: "", productUrl: "" };
        const cex = siblingCexGuides.get(entry.key) ?? {
          source: "CeX Portugal indisponível",
          date: "",
          loose: { status: "unavailable" as const, reference: null },
          cib: { status: "unavailable" as const, reference: null },
          generic: { status: "unavailable" as const, reference: null },
        };
        return [entry.key, buildWishlistBuyReferenceGuide(price, cex)];
      }))
    : {};
  const siblings = selectWishlistItems(candidates, state, {}, siblingBuyReferences);
  const { previous, next } = ordered ? { previous: null, next: null } : getWishlistNeighbors(siblings, target);
  const buyReference = buildWishlistBuyReferenceGuide(guide, cexGuide);
  const siblingHref = (item: typeof target) =>
    "/wish/" + encodeURIComponent(item.targetId) +
    "?platform=" + encodeURIComponent(item.platform) +
    "&title=" + encodeURIComponent(item.title) +
    "&from=" + encodeURIComponent(back);
  const profile = physicalCopyProfile(target.platform);
  const today = new Date().toISOString().slice(0, 10);

  return <div className="mx-auto max-w-4xl space-y-5 pb-10">
    <div className="flex items-center justify-between gap-3">
      <Link href={back} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#17382e]">
        <ArrowLeft className="h-3.5 w-3.5" />{ordered ? "Wishlist / a caminho" : "Wishlist"}
      </Link>
      <div className="flex gap-2">
        {previous && <Link href={siblingHref(previous)} className="reference-link">← Anterior</Link>}
        {next && <Link href={siblingHref(next)} className="reference-link">Seguinte →</Link>}
      </div>
    </div>

    <section className="collection-panel grid gap-6 p-4 sm:grid-cols-[240px_minmax(0,1fr)] sm:p-6">
      <WishlistArtwork title={target.title} platform={target.platform} artworkSrc={artworkSrc} className="mx-auto h-[330px] w-[240px] sm:mx-0" eager />
      <div className="min-w-0">
        <p className={"eyebrow " + (ordered ? "text-amber-700" : "text-rose-700")}>
          {ordered ? "A CAMINHO" : "WISHLIST"} · {displayPlatform(target.platform)}
        </p>
        <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-slate-950">{target.title}</h1>
        {ordered && <span className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-900">Encomendado</span>}
        <dl className="mt-5 grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 text-sm">
          <dt className="text-slate-500">Ano</dt><dd className="font-bold">{year}</dd>
          <dt className="text-slate-500">Developer</dt><dd className="font-bold">{metadata?.developers.join(", ") || "—"}</dd>
          <dt className="text-slate-500">Publisher</dt><dd className="font-bold">{metadata?.publishers.join(", ") || "—"}</dd>
          <dt className="text-slate-500">Género</dt><dd className="font-bold">{metadata?.genres.slice(0, 2).join(" · ") || "—"}</dd>
        </dl>
        <div className="mt-5"><ReferenceLinks title={target.title} metacriticUrl={metadata?.reviewScoreUrl ?? ""} /></div>
      </div>
    </section>

    {ordered
      ? <OrderedPurchasePanel target={target} />
      : <WishlistBuyReferencePanel guide={buyReference} cexGuide={cexGuide} targetVersion={target.targetVersion} manualReferenceEur={target.priceCeilingEur} />}

    <section className="collection-panel p-4">
      <h2 className="text-sm font-black">O que procuro</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Info label="Prioridade" value={target.priority} />
        <Info label="Versão / condição alvo" value={target.targetVersion} />
        <Info label="Motivo" value={target.reason} />
        <Info label="Notas" value={target.notes} />
      </div>
    </section>

    <details className="collection-panel p-4">
      <summary className="cursor-pointer text-sm font-black">Editar wishlist</summary>
      <form action={editWishlistGame} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Hidden target={target} />
        <label><span className="field-label">Prioridade</span><select name="priority" defaultValue={target.priority || "Média"} className="field-input"><option>Alta</option><option>Média</option><option>Baixa</option><option>Grail</option></select></label>
        <Field name="priceCeilingEur" label="Referência manual (€)" value={target.priceCeilingEur ?? ""} type="number" step="0.01" />
        <Field name="targetVersion" label="Versão alvo" value={target.targetVersion} />
        <Field name="reason" label="Porque quero" value={target.reason} />
        <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" defaultValue={target.notes} className="field-input min-h-20" /></label>
        <ActionSubmitButton pendingLabel="A guardar…" className="min-h-11 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white sm:col-span-2">Guardar wishlist</ActionSubmitButton>
      </form>
    </details>

    {ordered ? <>
      {target.purchase ? <details className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" open>
        <summary className="cursor-pointer text-sm font-black text-emerald-900">Recebi este jogo — verificar cópia</summary>
        <form action={receiveWishlistPurchase} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Hidden target={target} />
          <Field name="receivedDate" label="Data de receção" value={today} type="date" />
          <Field name="edition" label="Edição" value="Standard" />
          <CollectionSelectField name="region" label="Região" options={REGION_OPTIONS} defaultValue="PAL" />
          <CollectionSelectField name="language" label="Idioma" options={LANGUAGE_OPTIONS} defaultValue="English" />
          <CollectionSelectField name="conditionGrade" label="Condição geral" options={CONDITION_OPTIONS} />
          <label><span className="field-label">Está selado?</span><select name="sealed" defaultValue="no" className="field-input"><option value="no">Não</option><option value="yes">Sim</option></select></label>

          <fieldset className="rounded-2xl border border-emerald-200 bg-white/70 p-4 sm:col-span-2">
            <legend className="px-1 text-sm font-black text-slate-900">O que chegou nesta cópia?</legend>
            <p className="mt-1 text-xs leading-5 text-slate-500">{profile.note}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {profile.components.map((component) => <ComponentStateField key={component.key} componentKey={component.key} label={component.label} />)}
            </div>
          </fieldset>

          <label className="sm:col-span-2"><span className="field-label">Notas da cópia</span><textarea name="notes" className="field-input min-h-20" /></label>
          <ActionSubmitButton pendingLabel="A receber…" className="min-h-11 rounded-xl bg-emerald-900 px-4 text-sm font-black text-white sm:col-span-2">Recebi — adicionar à coleção</ActionSubmitButton>
        </form>
      </details> : <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
        A encomenda está marcada como comprada, mas o registo de compra associado não foi encontrado. Cancela a compra para voltar o jogo à wishlist antes de tentar novamente.
      </section>}

      <details className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <summary className="cursor-pointer text-xs font-black text-amber-900">A compra não se concretizou?</summary>
        <form action={cancelWishlistPurchase} className="mt-3">
          <Hidden target={target} />
          <p className="mb-3 text-xs font-semibold text-amber-800">O jogo volta à wishlist. O registo da compra fica guardado como cancelado.</p>
          <ActionSubmitButton pendingLabel="A cancelar…" className="min-h-10 rounded-xl bg-amber-900 px-4 text-sm font-black text-white">Cancelar compra e voltar à wishlist</ActionSubmitButton>
        </form>
      </details>
    </> : <>
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <h2 className="text-sm font-black text-emerald-900">Compraste este jogo?</h2>
        <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">Usa o mesmo fluxo global de Adicionar jogo. A identidade já vem preenchida a partir desta Wishlist.</p>
        <div className="mt-3">
          <QuickAddDialog
            platforms={[target.platform]}
            trigger="wishlist"
            prefillWishlist={{
              targetId: target.targetId,
              title: target.title,
              platform: target.platform,
              targetVersion: target.targetVersion,
              priority: target.priority,
            }}
          />
        </div>
      </section>

      <details className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
        <summary className="cursor-pointer text-xs font-black text-rose-800">Zona perigosa</summary>
        <form action={removeWishlistGame} className="mt-3"><Hidden target={target} /><ActionSubmitButton pendingLabel="A remover…" className="min-h-10 rounded-xl bg-rose-800 px-4 text-sm font-black text-white">Remover da wishlist</ActionSubmitButton></form>
      </details>
    </>}
  </div>;
}

function OrderedPurchasePanel({ target }: { target: Awaited<ReturnType<typeof getWantlist>>[number] }) {
  const purchase = target.purchase;
  return <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">COMPRADO / A CAMINHO</p><h2 className="mt-1 text-lg font-black text-amber-950">Ainda não conta como jogo da coleção</h2></div>
      <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-950">À espera de receção</span>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <Info label="Data de compra" value={purchase?.date || "—"} />
      <Info label="Preço pago" value={purchase?.totalPaidEur != null ? formatEuro(purchase.totalPaidEur) : "—"} />
      <Info label="Origem" value={purchase?.source || "—"} />
      <Info label="Vendedor" value={purchase?.seller || "—"} />
    </div>
    {purchase?.notes && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white/70 p-3 text-xs font-semibold text-amber-900">{purchase.notes}</p>}
  </section>;
}

function ComponentStateField({ componentKey, label }: { componentKey: PhysicalComponentKey; label: string }) {
  return <label><span className="field-label">{label}</span><select name={"component_" + componentKey} defaultValue="unknown" className="field-input"><option value="yes">Tenho</option><option value="no">Falta</option><option value="unknown">Verificar depois</option></select></label>;
}

function Hidden({ target }: { target: { targetId: string; title: string; platform: string } }) {
  return <><input type="hidden" name="targetId" value={target.targetId} /><input type="hidden" name="title" value={target.title} /><input type="hidden" name="platform" value={target.platform} /></>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f4f1e8] px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 whitespace-pre-wrap text-sm font-semibold">{value || "—"}</p></div>;
}

function Field({
  name,
  label,
  value,
  type = "text",
  step,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  value: string | number;
  type?: string;
  step?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return <label><span className="field-label">{label}</span><input name={name} type={type} step={step} required={required} placeholder={placeholder} defaultValue={value} className="field-input" /></label>;
}
