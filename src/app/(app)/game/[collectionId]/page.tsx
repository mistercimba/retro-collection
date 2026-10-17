import Link from "next/link";
import {ArrowLeft,ChevronRight,Check,BookOpen,Package,Disc3,HelpCircle,X,Settings2,NotebookPen,CheckCircle2} from "lucide-react";
import {physicalCopyProfile} from "@/lib/physical-copy-profile.logic";
import {componentPresentation,copyOwnershipLabel,completionSummary,platformBadgeLabel} from "@/lib/game-showcase.logic";
import "./game-showcase.css";
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


 const parts=componentPresentation(game,physicalCopyProfile(game.platform));
 const completion=completionSummary(parts,componentNeeds.active.length);

 return <div className="game-showcase">
  <section className="showcase-hero">
   <div className="showcase-atmosphere" aria-hidden="true">
    <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} catalogArtwork={Boolean(game.catalog?.artwork?.pathname)} className="showcase-atmosphere-art" />
   </div>
   <div className="showcase-hero-inner">

    <div className="showcase-navigation">
     <Link href={returnTo} className="showcase-back"><ArrowLeft size={16}/> Voltar para a Biblioteca</Link>
     <nav aria-label="Localização na biblioteca" className="showcase-breadcrumbs">
      <Link href="/collection">Biblioteca</Link><ChevronRight size={13} aria-hidden="true"/>
      <Link href={`/platform/${platformSlug(game.platform)}`}>{displayPlatform(game.platform)}</Link><ChevronRight size={13} aria-hidden="true"/>
      <span aria-current="page" title={game.title}>{game.title}</span>
     </nav>
    </div>
    <div className="showcase-hero-grid">
     <div className="showcase-cover-column">
      <div className="showcase-cover-scene">
       <div className="showcase-cover-3d">
        <div className="showcase-case-spine" aria-hidden="true">
         <span className="showcase-spine-platform">{platformBadgeLabel(game.platform)}</span>
         <span className="showcase-spine-title">{game.title}</span>
        </div>
        <div className="showcase-case-face">
         <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} catalogArtwork={Boolean(game.catalog?.artwork?.pathname)} className="showcase-cover-art" eager />
        </div>
       </div>
      </div>
      <ReferenceLinks title={game.title} metacriticUrl={research.metascore.url}/>
     </div>
     <div className="showcase-primary">
      <p className="showcase-overline">{[publisher,year].filter(Boolean).join(" · ")}</p>
      <div className="showcase-title-row">
       <h1>{game.title}</h1>
       <span className="showcase-platform-badge" aria-label={`Plataforma: ${displayPlatform(game.platform)}`}>{platformBadgeLabel(game.platform)}</span>
      </div>
      {genre&&<p className="showcase-genre">{genre}</p>}
      <div className={"showcase-ownership "+(game.keepStatus==="Collection"?"showcase-owned":"showcase-not-owned")}>
       {game.keepStatus==="Collection"&&<Check size={21} strokeWidth={3}/>}
       {copyOwnershipLabel(game.keepStatus)}
      </div>
      <div className="showcase-chips">
       {game.region&&<span className="showcase-chip showcase-region">{game.region}</span>}
       {game.edition&&<span className="showcase-chip">{game.edition}</span>}
       {game.overallStatus&&<span className="showcase-chip showcase-status">{game.overallStatus}</span>}
       {game.conditionGrade&&<span className="showcase-chip showcase-condition">{game.conditionGrade}</span>}
      </div>
      <div className="showcase-card-grid">
       <article className="showcase-glass-card">
        <h2><Package size={19}/> A minha cópia</h2>
        <dl className="showcase-facts">
         <div><dt>Preço pago</dt><dd className="showcase-fact-value">{formatEuro(paid)}</dd></div>
         <div><dt>Estimativa de mercado</dt><dd className="showcase-fact-value">{formatEuro(estimatedValue)}</dd></div>
         <div><dt>{audit?.productCode?"Código da edição":"ID da cópia"}</dt><dd className="showcase-fact-id">{audit?.productCode||game.collectionId}</dd></div>
        </dl>
        <p className="showcase-source">{estimatedValue===null?"Valor não disponível":copyValueDescription(copyValue)}</p>
       </article>
       <article className="showcase-glass-card">
        <h2><CheckCircle2 size={19}/> Peças e completude</h2>
        <div className="showcase-component-grid">
         {parts.map(part=><ShowcasePart key={part.key} label={part.label} kind={part.key} state={part.state}/>)}
        </div>
        <p role="status" className={"showcase-completion-result "+(completion.state==="complete"?"showcase-ok":completion.state==="missing"?"showcase-missing":"")}>
         {completion.state==="complete"&&<CheckCircle2 size={18} aria-hidden="true"/>}
         {completion.label}
        </p>
       </article>
      </div>
     </div>
    </div>
   </div>
  </section>

  <div className="showcase-bottom">
   <div className="showcase-left">
    <OwnedCopyPhotos collectionId={game.collectionId} title={game.title} photos={game.photos??[]} showcase/>
    <PriceGuidePanel guide={research.priceGuide} cexCashEur={game.cexCashEur} compact/>
    <OwnedCopyGroup current={game} copies={copies} returnTo={returnTo} copyValues={copyValues}/>
   </div>
   <div className="showcase-right">
    <PhysicalAuditEditor game={game}/>
    <details className="showcase-accordion">
     <summary><NotebookPen size={18}/> Notas do colecionador</summary>
     <div className="showcase-accordion-content">
      {game.notes?<p className="whitespace-pre-wrap">{game.notes}</p>:<p className="showcase-dimmed">Ainda sem notas desta cópia.</p>}
      {auditFields.length>0&&<details className="showcase-subdetails">
       <summary>Observações da auditoria ({auditFields.length})</summary>
       <dl className="showcase-audit-list">
        {auditFields.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        {audit?.auditDate&&<div><dt>Data</dt><dd>{audit.auditDate}</dd></div>}
        {audit?.auditNotes&&<div><dt>Notas</dt><dd>{audit.auditNotes}</dd></div>}
       </dl>
      </details>}
      {(game.purchase?.date||game.acquiredDate||game.purchase?.source)&&<p className="showcase-dimmed">Aquisição: {[game.purchase?.date||game.acquiredDate,game.purchase?.source].filter(Boolean).join(" · ")}</p>}
     </div>
    </details>
    <details className="showcase-accordion showcase-options">
     <summary><Settings2 size={18}/> Opções da cópia</summary>
     <div className="showcase-accordion-content">
      <CopyCompletionPanel game={game} activeNeeds={componentNeeds.active} history={componentNeeds.history}/>
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

     </div>
    </details>
   </div>
  </div>
 </div>;
}
function ShowcasePart({label,kind,state}:{label:string;kind:"media"|"box"|"manual";state:"yes"|"no"|"unknown"}) {
 const Icon=kind==="box"?Package:kind==="manual"?BookOpen:Disc3;
 const Status=state==="yes"?CheckCircle2:state==="no"?X:HelpCircle;
 return <div className={"showcase-component showcase-part-"+state}>
  <span className="showcase-component-art"><Icon size={32} strokeWidth={1.7}/><Status size={16} className="showcase-part-status"/></span>
  <span>{label}</span>
  <small>{state==="yes"?"Tenho":state==="no"?"Falta":"Por verificar"}</small>
 </div>;
}

function Field({name,label,value,type="text",step}:{name:string;label:string;value:string|number;type?:string;step?:string}){return <label><span className="field-label">{label}</span><input name={name} type={type} step={step} defaultValue={value} className="field-input"/></label>}