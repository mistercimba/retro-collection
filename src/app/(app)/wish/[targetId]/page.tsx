import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {notFound} from "next/navigation";
import {WishlistArtwork} from "@/components/wishlist-artwork";
import {PriceGuidePanel} from "@/components/price-guide";
import {ReferenceLinks} from "@/components/reference-links";
import {editWishlistGame,purchaseWishlistGame,removeWishlistGame} from "@/lib/library-actions";
import {getWantlist} from "@/lib/data/collection-service";
import {displayPlatform,platformSlug} from "@/lib/data/platforms";
import {findGameMetadataByTitle} from "@/lib/game-metadata";
import {getPricechartingGuide} from "@/lib/pricecharting-catalog";
import {getSafeListReturnPath} from "@/lib/list-url-state.logic";

export default async function WishDetailPage({params,searchParams}:{params:Promise<{targetId:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const[{targetId},query,targets]=await Promise.all([params,searchParams,getWantlist()]);
 const decodedId=decodeURIComponent(targetId);
 const wantedPlatform=typeof query.platform==="string"?query.platform:"";
 const wantedTitle=typeof query.title==="string"?query.title:"";
 const target=targets.find(x=>x.targetId===decodedId&&(!wantedPlatform||x.platform===wantedPlatform)&&(!wantedTitle||x.title===wantedTitle))??targets.find(x=>x.targetId===decodedId);
 if(!target) notFound();
 const guide=await getPricechartingGuide(target.platform,target.title,target.targetVersion);
 const metadata=findGameMetadataByTitle(target.title);
 const back=getSafeListReturnPath(query.from)??`/platform/${platformSlug(target.platform)}?tab=wishlist`;
 const year=metadata?.firstReleaseDate?metadata.firstReleaseDate.slice(0,4):"—";
 const siblings=targets.filter(x=>x.platform===target.platform&&x.planState!=="inactive"&&x.matchState!=="acquired").sort((a,b)=>a.title.localeCompare(b.title,"pt-PT"));
 const index=siblings.findIndex(x=>x.targetId===target.targetId&&x.title===target.title);
 const siblingHref=(item:typeof target)=>`/wish/${encodeURIComponent(item.targetId)}?platform=${encodeURIComponent(item.platform)}&title=${encodeURIComponent(item.title)}&from=${encodeURIComponent(back)}`;
 const previous=index>0?siblings[index-1]:null;
 const next=index>=0&&index<siblings.length-1?siblings[index+1]:null;

 return <div className="mx-auto max-w-4xl space-y-5 pb-10">
  <div className="flex items-center justify-between gap-3"><Link href={back} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#17382e]"><ArrowLeft className="h-3.5 w-3.5"/>Wishlist</Link><div className="flex gap-2">{previous&&<Link prefetch={false} href={siblingHref(previous)} className="reference-link">← Anterior</Link>}{next&&<Link prefetch={false} href={siblingHref(next)} className="reference-link">Seguinte →</Link>}</div></div>
  <section className="collection-panel grid gap-6 p-4 sm:grid-cols-[240px_minmax(0,1fr)] sm:p-6">
   <WishlistArtwork title={target.title} platform={target.platform} className="mx-auto h-[330px] w-[240px] sm:mx-0"/>
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
  <PriceGuidePanel guide={guide} maxPayEur={target.priceCeilingEur}/>
  <section className="collection-panel p-4">
   <h2 className="text-sm font-black">O que procuro</h2>
   <div className="mt-3 grid gap-2 sm:grid-cols-2"><Info label="Prioridade" value={target.priority}/><Info label="Versão / condição alvo" value={target.targetVersion}/><Info label="Motivo" value={target.reason}/><Info label="Notas" value={target.notes}/></div>
  </section>

  <details className="collection-panel p-4">
   <summary className="cursor-pointer text-sm font-black">Editar wishlist</summary>
   <form action={editWishlistGame} className="mt-4 grid gap-3 sm:grid-cols-2">
    <Hidden target={target}/>
    <label><span className="field-label">Prioridade</span><select name="priority" defaultValue={target.priority||"Média"} className="field-input"><option>Alta</option><option>Média</option><option>Baixa</option><option>Grail</option></select></label>
    <Field name="priceCeilingEur" label="Máximo que pago (€)" value={target.priceCeilingEur??""} type="number" step="0.01"/><Field name="targetVersion" label="Versão alvo" value={target.targetVersion}/><Field name="reason" label="Porque quero" value={target.reason}/>
    <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" defaultValue={target.notes} className="field-input min-h-20"/></label>
    <button className="min-h-11 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white sm:col-span-2">Guardar wishlist</button>
   </form>
  </details>

  <details className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
   <summary className="cursor-pointer text-sm font-black text-emerald-900">Comprei este jogo</summary>
   <form action={purchaseWishlistGame} className="mt-4 grid gap-3 sm:grid-cols-2">
    <Hidden target={target}/>
    <Field name="paid" label="Preço pago (€)" value="" type="number" step="0.01" required/><Field name="source" label="Onde comprei" value="" placeholder="Feira, Vinted, CeX…"/><Field name="purchaseDate" label="Data" value="" type="date"/><Field name="conditionGrade" label="Condição" value=""/><Field name="overallStatus" label="Completude" value="" placeholder="CIB / Loose / Incompleto"/><Field name="region" label="Região" value="" placeholder="PAL"/><Field name="edition" label="Edição" value="" placeholder="Standard"/><Field name="language" label="Idioma" value=""/><Field name="seller" label="Vendedor" value=""/><Field name="listingUrl" label="Link do anúncio" value="" type="url"/>
    <label className="sm:col-span-2"><span className="field-label">Notas</span><textarea name="notes" className="field-input min-h-20"/></label>
    <button className="min-h-11 rounded-xl bg-emerald-900 px-4 text-sm font-black text-white sm:col-span-2">Adicionar à coleção</button>
   </form>
  </details>

  <details className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
   <summary className="cursor-pointer text-xs font-black text-rose-800">Zona perigosa</summary>
   <form action={removeWishlistGame} className="mt-3"><Hidden target={target}/><button className="min-h-10 rounded-xl bg-rose-800 px-4 text-sm font-black text-white">Remover da wishlist</button></form>
  </details>
 </div>;
}
function Hidden({target}:{target:{targetId:string;title:string;platform:string}}){return <><input type="hidden" name="targetId" value={target.targetId}/><input type="hidden" name="title" value={target.title}/><input type="hidden" name="platform" value={target.platform}/></>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-[#f4f1e8] px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 whitespace-pre-wrap text-sm font-semibold">{value||"—"}</p></div>}
function Field({name,label,value,type="text",step,required,placeholder}:{name:string;label:string;value:string|number;type?:string;step?:string;required?:boolean;placeholder?:string}){return <label><span className="field-label">{label}</span><input name={name} type={type} step={step} required={required} placeholder={placeholder} defaultValue={value} className="field-input"/></label>}
