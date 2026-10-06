import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {notFound} from "next/navigation";
import {GameArtwork} from "@/components/artwork";
import {PriceGuidePanel} from "@/components/price-guide";
import {ReferenceLinks} from "@/components/reference-links";
import {editGame,removeCollectionGame} from "@/lib/library-actions";
import {getGame,getGameCopies} from "@/lib/data/collection-service";
import {displayPlatform,platformSlug} from "@/lib/data/platforms";
import {formatEuro} from "@/lib/format";
import {getGameResearch} from "@/lib/game-research";
import {getSafeListReturnPath} from "@/lib/list-url-state.logic";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { CollectionSelectField } from "@/components/collection-select-field";
import { CONDITION_OPTIONS, LANGUAGE_OPTIONS, REGION_OPTIONS } from "@/lib/collection-field-options";
import { OwnedCopyPhotos } from "@/components/owned-copy-photos";
import { OwnedCopyGroup } from "@/components/owned-copy-group";

export default async function GamePage({params,searchParams}:{params:Promise<{collectionId:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const[{collectionId},query]=await Promise.all([params,searchParams]);
 const game=await getGame(decodeURIComponent(collectionId));
 if(!game) notFound();
 const returnTo=getSafeListReturnPath(query.from)??`/platform/${platformSlug(game.platform)}`;
 const[research,copies]=await Promise.all([getGameResearch(game),getGameCopies(game.collectionId)]);
 const metadata=research.metadata;
 const year=metadata?.firstReleaseDate?metadata.firstReleaseDate.slice(0,4):"—";
 const paid=game.purchase?.totalPaidEur??game.allocatedCostEur;
 const estimatedValue=game.latestValuation?.valueEur??game.marketValueEur;
 const valueDifference=paid!==null&&paid!==undefined&&estimatedValue!==null&&estimatedValue!==undefined?estimatedValue-paid:null;
 const audit=game.audit;
 const auditFields=[
  ["Funcional",audit?.functionalStatus],
  ["Disco / cartucho",audit?.mediaCondition],
  ["Label",audit?.labelCondition],
  ["Caixa",audit?.boxCondition],
  ["Manual",audit?.manualCondition],
  ["Completude auditada",audit?.completeness],
  ["Código",audit?.productCode],
  ["Idiomas observados",audit?.observedLanguages],
 ].filter((entry):entry is [string,string]=>Boolean(entry[1]));

 return <div className="mx-auto max-w-4xl space-y-5 pb-10">
  <Link href={returnTo} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#17382e]"><ArrowLeft className="h-3.5 w-3.5"/>Voltar</Link>

  <section className="collection-panel grid gap-6 p-4 sm:grid-cols-[240px_minmax(0,1fr)] sm:p-6">
   <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} catalogArtwork={Boolean(game.catalog?.artwork?.pathname)} className="mx-auto h-[330px] w-[240px] rounded-2xl bg-slate-50 object-contain sm:mx-0" eager/>
   <div className="min-w-0">
    <p className="eyebrow">{displayPlatform(game.platform)}</p>
    <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-slate-950">{game.title}</h1>
    <dl className="mt-5 grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 text-sm">
     <dt className="text-slate-500">Ano</dt><dd className="font-bold text-slate-900">{year}</dd>
     <dt className="text-slate-500">Developer</dt><dd className="font-bold text-slate-900">{metadata?.developers.join(", ")||"—"}</dd>
     <dt className="text-slate-500">Publisher</dt><dd className="font-bold text-slate-900">{metadata?.publishers.join(", ")||"—"}</dd>
     <dt className="text-slate-500">Género</dt><dd className="font-bold text-slate-900">{metadata?.genres.slice(0,2).join(" · ")||"—"}</dd>
    </dl>
    <div className="mt-5"><ReferenceLinks title={game.title} metacriticUrl={research.metascore.url}/></div>
   </div>
  </section>

  <PriceGuidePanel guide={research.priceGuide} cexCashEur={game.cexCashEur}/>

  <OwnedCopyGroup current={game} copies={copies} returnTo={returnTo}/>

  <section className="collection-panel p-4">
   <div className="flex flex-wrap items-baseline justify-between gap-2">
    <h2 className="text-sm font-black text-slate-950">A minha cópia</h2>
    {audit?.auditDate&&<span className="text-[11px] font-semibold text-slate-400">Auditoria · {audit.auditDate}</span>}
   </div>
   <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
    <Info label="Collection ID" value={game.collectionId}/>
    <Info label="Região / edição" value={[game.region,game.edition].filter(Boolean).join(" · ")}/>
    <Info label="Completude" value={game.overallStatus}/>
    <Info label="Condição geral" value={game.conditionGrade}/>
    <Info label="Preço pago" value={paid!==null&&paid!==undefined?formatEuro(paid):"—"}/>
    <Info label="Valor estimado" value={estimatedValue!==null&&estimatedValue!==undefined?formatEuro(estimatedValue):"—"}/>
    <Info label="Diferença vs. pago" value={formatDifference(valueDifference)}/>
    <Info label="Compra" value={[game.purchase?.date,game.purchase?.source].filter(Boolean).join(" · ")}/>
   </dl>

   {auditFields.length>0&&<div className="mt-4 rounded-2xl border border-[#e2ddd2] bg-[#faf8f2] p-3">
    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#466558]">Auditoria física</p>
    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
     {auditFields.map(([label,value])=><Info key={label} label={label} value={value}/>)}
    </dl>
    {audit?.missingComponents&&<p className="mt-2 text-xs font-semibold text-amber-800">Em falta: {audit.missingComponents}</p>}
    {audit?.auditNotes&&<p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{audit.auditNotes}</p>}
   </div>}

   {game.notes&&<p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#f4f1e8] p-3 text-xs leading-5 text-slate-600">{game.notes}</p>}
  </section>

  <OwnedCopyPhotos collectionId={game.collectionId} title={game.title} photos={game.photos??[]}/>

  <details className="collection-panel p-4">
   <summary className="cursor-pointer text-sm font-black text-slate-900">Editar a minha cópia</summary>
   <form action={editGame} className="mt-4 grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="collectionId" value={game.collectionId}/>
    <CollectionSelectField name="region" label="Região" options={REGION_OPTIONS} defaultValue={game.region}/><Field name="edition" label="Edição" value={game.edition}/><CollectionSelectField name="language" label="Idioma" options={LANGUAGE_OPTIONS} defaultValue={game.language}/><Field name="overallStatus" label="Completude" value={game.overallStatus}/><CollectionSelectField name="conditionGrade" label="Condição" options={CONDITION_OPTIONS} defaultValue={game.conditionGrade}/>
    <Field name="paid" label="Preço pago (€)" value={game.purchase?.totalPaidEur??game.allocatedCostEur??""} type="number" step="0.01"/><Field name="source" label="Onde comprei" value={game.purchase?.source??""}/><Field name="purchaseDate" label="Data de compra" value={game.purchase?.date||game.acquiredDate||""} type="date"/><Field name="seller" label="Vendedor" value={game.purchase?.seller??""}/><Field name="listingUrl" label="Link do anúncio" value={game.purchase?.listingUrl??""} type="url"/><Field name="purchaseNotes" label="Notas da compra" value={game.purchase?.notes??""}/>
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
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-[#f4f1e8] px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{value||"—"}</p></div>}
function Field({name,label,value,type="text",step}:{name:string;label:string;value:string|number;type?:string;step?:string}){return <label><span className="field-label">{label}</span><input name={name} type={type} step={step} defaultValue={value} className="field-input"/></label>}