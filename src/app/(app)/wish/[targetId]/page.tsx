import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {notFound} from "next/navigation";
import {WishlistArtwork} from "@/components/wishlist-artwork";
import {WishlistBuyReferencePanel} from "@/components/wishlist-buy-reference-panel";
import {ReferenceLinks} from "@/components/reference-links";
import {editWishlistGame,purchaseWishlistGame,removeWishlistGame} from "@/lib/library-actions";
import {getWantlist} from "@/lib/data/collection-service";
import {displayPlatform,platformSlug} from "@/lib/data/platforms";
import {findGameMetadataByTitle} from "@/lib/game-metadata";
import {getPricechartingGuide,getPricechartingGuides} from "@/lib/pricecharting-catalog";
import {getCexWishlistGuide,getCexWishlistGuides} from "@/lib/cex-catalog";
import {buildWishlistBuyReferenceGuide} from "@/lib/wishlist-buy-reference.logic";
import {getSafeListReturnPath} from "@/lib/list-url-state.logic";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { CollectionSelectField } from "@/components/collection-select-field";
import { CONDITION_OPTIONS, LANGUAGE_OPTIONS, REGION_OPTIONS } from "@/lib/collection-field-options";
import { resolveWishlistArtwork } from "@/lib/wishlist-artwork";
import { filterWishlistItems, getWishlistNeighbors, getWishlistOriginState, selectWishlistItems, wishlistPriceKey } from "@/lib/wishlist-price.logic";

export default async function WishDetailPage({params,searchParams}:{params:Promise<{targetId:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const[{targetId},query,targets]=await Promise.all([params,searchParams,getWantlist()]);
 const decodedId=decodeURIComponent(targetId);
 const wantedPlatform=typeof query.platform==="string"?query.platform:"";
 const wantedTitle=typeof query.title==="string"?query.title:"";
 const target=targets.find(x=>x.targetId===decodedId&&(!wantedPlatform||x.platform===wantedPlatform)&&(!wantedTitle||x.title===wantedTitle))??targets.find(x=>x.targetId===decodedId);
 if(!target) notFound();
 const guidePromise=getPricechartingGuide(target.platform,target.title,target.targetVersion);
 const cexGuidePromise=getCexWishlistGuide(target.platform,target.title,target.targetVersion);
 const metadata=findGameMetadataByTitle(target.title);
 const artworkSrc=resolveWishlistArtwork(target);
 const back=getSafeListReturnPath(query.from)??`/platform/${platformSlug(target.platform)}?tab=wishlist`;
 const year=metadata?.firstReleaseDate?metadata.firstReleaseDate.slice(0,4):"—";
 const origin=getWishlistOriginState(query.from,platformSlug(target.platform));
 const state=origin??{tab:"wishlist" as const,q:"",filter:"all",condition:"all",reference:"all",sort:"title"};
 const candidates=filterWishlistItems(targets.filter(x=>x.platform===target.platform&&x.planState!=="inactive"&&x.matchState!=="acquired"),state);
 const needsBuyReferences=Boolean(origin&&(origin.reference!=="all"||origin.sort==="buy-desc"));
 const siblingEntries=candidates.map(x=>({key:wishlistPriceKey(x),platform:x.platform,title:x.title,edition:x.targetVersion}));
 const [siblingPriceGuides,siblingCexGuides]=needsBuyReferences
  ?await Promise.all([getPricechartingGuides(siblingEntries),getCexWishlistGuides(siblingEntries)])
  :[new Map(),new Map()];
 const siblingBuyReferences=needsBuyReferences?Object.fromEntries(siblingEntries.map(entry=>{
  const price=siblingPriceGuides.get(entry.key)??{looseEur:null,cibEur:null,newEur:null,source:"Preço indisponível",date:"",productUrl:""};
  const cex=siblingCexGuides.get(entry.key)??{source:"CeX Portugal indisponível",date:"",loose:{status:"unavailable" as const,reference:null},cib:{status:"unavailable" as const,reference:null},generic:{status:"unavailable" as const,reference:null}};
  return [entry.key,buildWishlistBuyReferenceGuide(price,cex)];
 })):{};
 const siblings=selectWishlistItems(candidates,state,{},siblingBuyReferences);
 const {previous,next}=getWishlistNeighbors(siblings,target);
 const [guide,cexGuide]=await Promise.all([guidePromise,cexGuidePromise]);
 const buyReference=buildWishlistBuyReferenceGuide(guide,cexGuide);
 const siblingHref=(item:typeof target)=>`/wish/${encodeURIComponent(item.targetId)}?platform=${encodeURIComponent(item.platform)}&title=${encodeURIComponent(item.title)}&from=${encodeURIComponent(back)}`;

 return <div className="mx-auto max-w-4xl space-y-5 pb-10">
  <div className="flex items-center justify-between gap-3"><Link href={back} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#17382e]"><ArrowLeft className="h-3.5 w-3.5"/>Wishlist</Link><div className="flex gap-2">{previous&&<Link href={siblingHref(previous)} className="reference-link">← Anterior</Link>}{next&&<Link href={siblingHref(next)} className="reference-link">Seguinte →</Link>}</div></div>
  <section className="collection-panel grid gap-6 p-4 sm:grid-cols-[240px_minmax(0,1fr)] sm:p-6">
   <WishlistArtwork title={target.title} platform={target.platform} artworkSrc={artworkSrc} className="mx-auto h-[330px] w-[240px] sm:mx-0" eager/>
   <div className="min-w-0">
    <p className="eyebrow text-rose-700">WISHLIST · {displayPlatform(target.platform)}</p>
    <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-slate-950">{target.title}</h1>
    <dl className="mt-5 grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 text-sm">
     <dt className="text-slate-500">Ano</dt><dd className="font-bold">{year}</dd>
     <dt className="text-slate-500">Developer</dt><dd className="font-bold">{metadata?.developers.join(", ")||"—"}</dd>
     <dt className="text-slate-500">Publisher</dt><dd className="font-bold">{metadata?.publishers.join(", ")||"—"}</dd>
     <dt className="text-slate-500">Género</dt><dd className="font-bold">{metadata?.genres.slice(0,2).join(" · ")||"—"}</dd>
    </dl>
    <div className="mt-5"><ReferenceLinks title={target.title} metacriticUrl={metadata?.reviewScoreUrl??""}/></div>
   </div>
  </section>
  <WishlistBuyReferencePanel guide={buyReference} cexGuide={cexGuide} targetVersion={target.targetVersion} manualReferenceEur={target.priceCeilingEur}/>
  <section className="collection-panel p-4">
   <h2 className="text-sm font-black">O que procuro</h2>
   <div className="mt-3 grid gap-2 sm:grid-cols-2"><Info label="Prioridade" value={target.priority}/><Info label="Versão / condição alvo" value={target.targetVersion}/><Info label="Motivo" value={target.reason}/><Info label="Notas" value={target.notes}/></div>
  </section>

  <details className="collection-panel p-4">
   <summary className="cursor-pointer text-sm font-black">Editar wishlist</summary>
   <form action={editWishlistGame} className="mt-4 grid gap-3 sm:grid-cols-2">
    <Hidden target={target}/>
    <label><span className="field-label">Prioridade</span><select name="priority" defaultValue={target.priority||"Média"} className="field-input"><option>Alta</option><option>Média</option><option>Baixa</option><option>Grail</option></select></label>
    <Field name="priceCeilingEur" label="Referência manual (€)" value={target.priceCeilingEur??""} type="number" step="0.01"/><Field name="targetVersion" label="Versão alvo" value={target.targetVersion}/><Field name="reason" label="Porque quero" value={target.reason}/>
    <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" defaultValue={target.notes} className="field-input min-h-20"/></label>
    <ActionSubmitButton pendingLabel="A guardar…" className="min-h-11 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white sm:col-span-2">Guardar wishlist</ActionSubmitButton>
   </form>
  </details>

  <details className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
   <summary className="cursor-pointer text-sm font-black text-emerald-900">Comprei este jogo</summary>
   <form action={purchaseWishlistGame} className="mt-4 grid gap-3 sm:grid-cols-2">
    <Hidden target={target}/>
    <Field name="paid" label="Preço pago (€)" value="" type="number" step="0.01" required/><Field name="source" label="Onde comprei" value="" placeholder="Feira, Vinted, CeX…"/><Field name="purchaseDate" label="Data" value="" type="date"/><CollectionSelectField name="conditionGrade" label="Condição" options={CONDITION_OPTIONS}/><Field name="overallStatus" label="Completude" value="" placeholder="CIB / Loose / Incompleto"/><CollectionSelectField name="region" label="Região" options={REGION_OPTIONS} defaultValue="PAL"/><Field name="edition" label="Edição" value="" placeholder="Standard"/><CollectionSelectField name="language" label="Idioma" options={LANGUAGE_OPTIONS} defaultValue="English"/><Field name="seller" label="Vendedor" value=""/><Field name="listingUrl" label="Link do anúncio" value="" type="url"/>
    <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20"/></label>
    <ActionSubmitButton pendingLabel="A adicionar à coleção…" className="min-h-11 rounded-xl bg-emerald-900 px-4 text-sm font-black text-white sm:col-span-2">Adicionar à coleção</ActionSubmitButton>
   </form>
  </details>

  <details className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
   <summary className="cursor-pointer text-xs font-black text-rose-800">Zona perigosa</summary>
   <form action={removeWishlistGame} className="mt-3"><Hidden target={target}/><ActionSubmitButton pendingLabel="A remover…" className="min-h-10 rounded-xl bg-rose-800 px-4 text-sm font-black text-white">Remover da wishlist</ActionSubmitButton></form>
  </details>
 </div>;
}
function Hidden({target}:{target:{targetId:string;title:string;platform:string}}){return <><input type="hidden" name="targetId" value={target.targetId}/><input type="hidden" name="title" value={target.title}/><input type="hidden" name="platform" value={target.platform}/></>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-[#f4f1e8] px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 whitespace-pre-wrap text-sm font-semibold">{value||"—"}</p></div>}
function Field({name,label,value,type="text",step,required,placeholder}:{name:string;label:string;value:string|number;type?:string;step?:string;required?:boolean;placeholder?:string}){return <label><span className="field-label">{label}</span><input name={name} type={type} step={step} required={required} placeholder={placeholder} defaultValue={value} className="field-input"/></label>}
