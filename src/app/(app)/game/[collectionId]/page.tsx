import Link from "next/link";
import {ArrowLeft,PackageOpen} from "lucide-react";
import {notFound} from "next/navigation";
import {GameArtwork} from "@/components/artwork";
import {PriceGuidePanel} from "@/components/price-guide";
import {ReferenceLinks} from "@/components/reference-links";
import {editGame,removeCollectionGame} from "@/lib/library-actions";
import {getComponentNeedsForGame,getGame,getGameCopies} from "@/lib/data/collection-service";
import {displayPlatform,platformSlug} from "@/lib/data/platforms";
import {formatEuro} from "@/lib/format";
import {resolveCopyValue, copyValueDescription} from "@/lib/collection-valuation.logic";
import {getPricechartingEstimates} from "@/lib/pricecharting-catalog";
import {getGameResearch} from "@/lib/game-research";
import {getSafeListReturnPath} from "@/lib/list-url-state.logic";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { CollectionSelectField } from "@/components/collection-select-field";
import { CONDITION_OPTIONS, LANGUAGE_OPTIONS, REGION_OPTIONS } from "@/lib/collection-field-options";
import { OwnedCopyPhotos } from "@/components/owned-copy-photos";
import { OwnedCopyGroup } from "@/components/owned-copy-group";
import { CopyCompletionPanel } from "@/components/copy-completion-panel";
import { PhysicalAuditEditor } from "@/components/physical-audit-editor";

export default async function GamePage({params,searchParams}:{params:Promise<{collectionId:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const[{collectionId},query]=await Promise.all([params,searchParams]);
 const game=await getGame(decodeURIComponent(collectionId));
 if(!game) notFound();
 const returnTo=getSafeListReturnPath(query.from)??`/platform/${platformSlug(game.platform)}`;
 const[research,copies,componentNeeds]=await Promise.all([getGameResearch(game),getGameCopies(game.collectionId),getComponentNeedsForGame(game.collectionId)]);
 const metadata=research.metadata;
 const year=metadata?.firstReleaseDate?metadata.firstReleaseDate.slice(0,4):"";
 const publisher=metadata?.publishers.join(", ") || "";
 const genre=metadata?.genres.slice(0,2).join(" · ") || "";
 const paid=game.purchase?.totalPaidEur??game.allocatedCostEur;
 const copyValue=resolveCopyValue(game,research.estimate);
 const estimatedValue=copyValue.value;
 const otherCopies=copies.filter((copy)=>copy.collectionId!==game.collectionId);
 const otherEstimates=otherCopies.length?await getPricechartingEstimates(otherCopies):new Map();
 const copyValues=Object.fromEntries(copies.map((copy)=>[
  copy.collectionId,
  copy.collectionId===game.collectionId?copyValue:resolveCopyValue(copy,otherEstimates.get(copy.collectionId)),
 ]));
 const valueDifference=paid!==null&&paid!==undefined&&estimatedValue!==null?estimatedValue-paid:null;
 const audit=game.audit;
 const auditFields=[
  ["Funcional",audit?.functionalStatus],
  ["Disco / cartucho",audit?.mediaCondition],
  ["Label",audit?.labelCondition],
  ["Caixa",audit?.boxCondition],
  ["Manual",audit?.manualCondition],
  ["Completude auditada",audit?.completeness],
  ["Código de produto / SKU",audit?.productCode],
  ["EAN observado",audit?.ean],
  ["Mercado observado",audit?.releaseMarket],
  ["Idiomas observados",audit?.observedLanguages],
  ["Estado da auditoria",audit?.auditStatus],
  ["Base da evidência",audit?.evidenceBasis],
 ].filter((entry):entry is [string,string]=>Boolean(entry[1]));

 return <div className="mx-auto max-w-4xl space-y-3 pb-10">
  <Link href={returnTo} className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#17382e]"><ArrowLeft className="h-3.5 w-3.5"/>Voltar</Link>

  <header className="collection-panel grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4 p-4 sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-5 sm:p-5">
    <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} catalogArtwork={Boolean(game.catalog?.artwork?.pathname)} className="aspect-[3/4] w-24 rounded-xl bg-slate-50 object-contain sm:w-[148px]" eager/>
    <div className="min-w-0">
      <p className="eyebrow">{displayPlatform(game.platform)}</p>
      <h1 className="mt-1 text-xl font-black leading-tight tracking-tight text-slate-950 sm:text-2xl">{game.title}</h1>
      <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm">
        {[year, publisher, genre].filter(Boolean).join(" · ") || "Ficha de coleção"}
      </p>
      {componentNeeds.active.length>0&&<p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">
        <PackageOpen className="h-3.5 w-3.5" /> {componentNeeds.active.length} {componentNeeds.active.length===1?"peça em falta":"peças em falta"}
      </p>}
      <div className="mt-3"><ReferenceLinks title={game.title} metacriticUrl={research.metascore.url}/></div>
      {(metadata?.developers.length || metadata?.genres.length || metadata?.publishers.length) && <details className="mt-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-[#315b47]">Ficha técnica</summary>
        <dl className="mt-2 grid grid-cols-[80px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
          {year && <><dt>Ano</dt><dd>{year}</dd></>}
          {metadata?.developers.length ? <><dt>Developer</dt><dd>{metadata.developers.join(", ")}</dd></> : null}
          {publisher && <><dt>Publisher</dt><dd>{publisher}</dd></>}
          {genre && <><dt>Género</dt><dd>{metadata?.genres.join(" · ")}</dd></>}
        </dl>
      </details>}
    </div>
  </header>

  <section className="collection-panel p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-black text-slate-950">A minha cópia</h2>
      <span className="text-[11px] font-semibold text-slate-500">{game.collectionId}</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">
      {[game.region, game.edition, game.overallStatus, game.conditionGrade].filter(Boolean).map((value, index) =>
        <span key={index} className="rounded-lg bg-[#f4f1e8] px-2.5 py-1 text-xs font-bold text-slate-700">{value}</span>
      )}
      {game.extras && <span className="rounded-lg bg-[#eaf2e9] px-2.5 py-1 text-xs font-semibold text-[#315b47]">Extras: {game.extras}</span>}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#ece7dd] pt-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Valor da cópia</p>
        <p className="mt-0.5 text-lg font-black text-slate-900">{formatEuro(estimatedValue)}</p>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">Origem do valor: {copyValueDescription(copyValue)}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Preço pago</p>
        <p className="mt-0.5 text-lg font-black text-slate-900">{formatEuro(paid)}</p>
        {valueDifference!==null&&<p className="mt-1 text-[11px] font-semibold text-slate-500">Diferença: {formatDifference(valueDifference)}</p>}
      </div>
    </div>
    {(auditFields.length>0||Boolean(game.notes)||Boolean(game.purchase?.date)||Boolean(game.purchase?.source)||Boolean(game.acquiredDate))&&
    <details className="mt-3 border-t border-[#ece7dd] pt-3">
      <summary className="cursor-pointer text-xs font-bold text-[#315b47]">Mais dados desta cópia</summary>
      <dl className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        <CompactInfo label="Collection ID" value={game.collectionId}/>
        <CompactInfo label="Compra" value={[game.purchase?.date||game.acquiredDate,game.purchase?.source].filter(Boolean).join(" · ")}/>
        {auditFields.map(([label,value])=><CompactInfo key={label} label={label} value={value}/>)}
        {audit?.auditDate&&<CompactInfo label="Data da auditoria" value={audit.auditDate}/>}
        {audit?.missingComponents&&<CompactInfo label="Peças auditadas em falta" value={audit.missingComponents}/>}
        {audit?.auditNotes&&<CompactInfo label="Notas da auditoria" value={audit.auditNotes}/>}
      </dl>
      {game.notes&&<p className="mt-3 whitespace-pre-wrap text-xs text-slate-600">{game.notes}</p>}
    </details>}
  </section>

  <PriceGuidePanel guide={research.priceGuide} cexCashEur={game.cexCashEur} compact/>

  <OwnedCopyGroup current={game} copies={copies} returnTo={returnTo} copyValues={copyValues}/>

  <PhysicalAuditEditor game={game}/>

  <CopyCompletionPanel game={game} activeNeeds={componentNeeds.active} history={componentNeeds.history}/>

  <OwnedCopyPhotos collectionId={game.collectionId} title={game.title} photos={game.photos??[]}/>

  <details className="collection-panel p-4">
   <summary className="cursor-pointer text-sm font-black text-slate-900">Editar a minha cópia</summary>
   <form action={editGame} className="mt-4 grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="collectionId" value={game.collectionId}/>
    <CollectionSelectField name="region" label="Região" options={REGION_OPTIONS} defaultValue={game.region}/><Field name="edition" label="Edição" value={game.edition}/><CollectionSelectField name="language" label="Idioma" options={LANGUAGE_OPTIONS} defaultValue={game.language}/><Field name="overallStatus" label="Completude" value={game.overallStatus}/><CollectionSelectField name="conditionGrade" label="Condição" options={CONDITION_OPTIONS} defaultValue={game.conditionGrade}/>
    <Field name="paid" label="Preço pago (€)" value={game.purchase?.totalPaidEur??game.allocatedCostEur??""} type="number" step="0.01"/><Field name="source" label="Onde comprei" value={game.purchase?.source??""}/><Field name="purchaseDate" label="Data de compra" value={game.purchase?.date||game.acquiredDate||""} type="date"/><Field name="seller" label="Vendedor" value={game.purchase?.seller??""}/><Field name="listingUrl" label="Link do anúncio" value={game.purchase?.listingUrl??""} type="url"/><Field name="purchaseNotes" label="Notas da compra" value={game.purchase?.notes??""}/>
    <label className="sm:col-span-2"><span className="field-label">Extras / acessórios da cópia</span><input name="extras" defaultValue={game.extras} className="field-input" placeholder="Ex.: Pokéwalker incluído"/></label>
    <label className="sm:col-span-2"><span className="field-label">Notas da cópia</span><textarea name="notes" defaultValue={game.notes} className="field-input min-h-24"/></label>
    <ActionSubmitButton pendingLabel="A guardar…" className="min-h-11 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white sm:col-span-2">Guardar alterações</ActionSubmitButton>
   </form>
  </details>

  <details className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
   <summary className="cursor-pointer text-xs font-black text-rose-800">Zona perigosa</summary>
   <p className="mt-2 text-xs text-rose-700">Só abre isto para remover mesmo o jogo.</p>
   <form action={removeCollectionGame} className="mt-3"><input type="hidden" name="collectionId" value={game.collectionId}/><ActionSubmitButton pendingLabel="A remover…" className="min-h-10 rounded-xl bg-rose-800 px-4 text-sm font-black text-white">Remover da coleção</ActionSubmitButton></form>
  </details>
 </div>;
}
function formatDifference(value:number|null){if(value===null)return "—";if(value===0)return formatEuro(0);return `${value>0?"+":"−"}${formatEuro(Math.abs(value))}`;}
function CompactInfo({label,value}:{label:string;value:string}){return <div className="min-w-0"><dt className="font-bold text-slate-500">{label}</dt><dd className="mt-0.5 whitespace-pre-wrap break-words text-slate-800">{value||"—"}</dd></div>}
function Field({name,label,value,type="text",step}:{name:string;label:string;value:string|number;type?:string;step?:string}){return <label><span className="field-label">{label}</span><input name={name} type={type} step={step} defaultValue={value} className="field-input"/></label>}