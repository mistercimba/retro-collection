"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GameArtwork } from "@/components/artwork";
import { WishlistArtwork } from "@/components/wishlist-artwork";
import { formatEuro } from "@/lib/format";
import { buildPlatformListUrl, parsePlatformListState, type PlatformListState, filterWishlistItems, selectWishlistItems, wishlistPriceKey } from "@/lib/wishlist-price.logic";
import { getWishlistPriceLines, type WishlistPriceGuide } from "@/lib/wishlist-price.logic";
import { saveListScrollPosition, useListScrollRestoration } from "@/hooks/use-list-scroll-restoration";

type C = { collectionId: string; title: string; genre: string; valueEur: number | null; condition: string; completeness: string };
type W = { targetId: string; title: string; priority: string; targetVersion: string; priceCeilingEur: number | null; artworkSrc: string | null };
type PriceLoad = { status: "idle" | "loading" | "loaded" | "error"; platform: string; prices: Record<string, WishlistPriceGuide> };
const PRIORITY_RANK: Record<string, number> = { grail: 0, alta: 1, "média": 2, media: 2, baixa: 3 };
const rank = (v: string) => PRIORITY_RANK[v.toLocaleLowerCase("pt-PT")] ?? 9;
const wishKey = wishlistPriceKey;
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function PlatformLibraryBrowser({slug,platform,initialTab,initialSearch="",collection,wishlist}:{slug:string;platform:string;initialTab:"collection"|"wishlist";initialSearch?:string;collection:C[];wishlist:W[]}){
 const router = useRouter();
 const [state,setState] = useState<PlatformListState>(()=>parsePlatformListState(initialSearch,initialTab));
 const stateRef = useRef(state);
 const [priceLoad,setPriceLoad] = useState<PriceLoad>({status:"idle",platform,prices:{}});
 const {tab,q,sort,filter} = state;
 useListScrollRestoration();

 useEffect(()=>{
  const controller = new AbortController();
  if(tab!=="wishlist"||wishlist.length===0)return;
  fetch(`/api/wishlist-prices?platform=${encodeURIComponent(platform)}`,{signal:controller.signal,cache:"no-store"})
   .then(async response=>response.ok?response.json():Promise.reject(new Error("Price request failed")))
   .then(data=>setPriceLoad({status:"loaded",platform,prices:data?.prices??{}}))
   .catch(()=>{if(!controller.signal.aborted)setPriceLoad(current=>({...current,status:"error",platform}));});
  return()=>controller.abort();
 },[tab,platform,wishlist.length]);

 const genres=useMemo(()=>[...new Set(collection.flatMap(x=>x.genre.split(",").map(y=>y.trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,"pt-PT")),[collection]);
 const priorities=useMemo(()=>[...new Set(wishlist.map(x=>x.priority).filter(Boolean))].sort((a,b)=>rank(a)-rank(b)),[wishlist]);
 const filteredWishlist=useMemo(()=>filterWishlistItems(wishlist,{q,filter}),[wishlist,q,filter]);
 const hasCeilings=filteredWishlist.some(x=>x.priceCeilingEur!==null);
 const cs=useMemo(()=>collection.filter(x=>(!q||x.title.toLocaleLowerCase("pt-PT").includes(q.toLocaleLowerCase("pt-PT")))&&(filter==="all"||x.genre.split(",").map(y=>y.trim()).includes(filter))).sort((a,b)=>sort==="title-desc"?b.title.localeCompare(a.title,"pt-PT"):sort==="value-desc"?(b.valueEur??-1)-(a.valueEur??-1):sort==="value-asc"?(a.valueEur??999999)-(b.valueEur??999999):a.title.localeCompare(b.title,"pt-PT")),[collection,q,filter,sort]);
 const ws=useMemo(()=>selectWishlistItems(filteredWishlist,{tab,q:"",filter:"all",sort},priceLoad.prices),[filteredWishlist,tab,sort,priceLoad.prices]);

 const updateState = useCallback((key:keyof PlatformListState,value:string)=>{
  const next={...stateRef.current,[key]:value} as PlatformListState;
  stateRef.current=next;
  setState(next);
  const href=buildPlatformListUrl(slug,next);
  window.history.replaceState(window.history.state,"",href);
 },[slug]);
 useIsoLayoutEffect(()=>{
  const sync=()=>{const next=parsePlatformListState(window.location.search,initialTab);stateRef.current=next;setState(next);};
  window.addEventListener("popstate",sync);
  return()=>window.removeEventListener("popstate",sync);
 },[initialTab]);
 useIsoLayoutEffect(()=>{
  const next=parsePlatformListState(initialSearch,initialTab);
  if(JSON.stringify(next)!==JSON.stringify(stateRef.current)){stateRef.current=next;setState(next);}
 },[initialSearch,initialTab]);
 const switchTab=(next:PlatformListState["tab"])=>{
  const nextState:PlatformListState={tab:next,q:"",filter:"all",sort:next==="wishlist"?"priority":"title"};
  if(next==="wishlist"&&priceLoad.platform!==platform)setPriceLoad({status:"idle",platform,prices:{}});
  stateRef.current=nextState;setState(nextState);
  router.replace(buildPlatformListUrl(slug,nextState),{scroll:false});
 };
 const returnTo=buildPlatformListUrl(slug,state);
 const saveScroll=(event:React.MouseEvent<HTMLAnchorElement>)=>{
  if(!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey&&event.button===0)saveListScrollPosition(returnTo);
 };
 const loading=tab==="wishlist"&&(priceLoad.platform!==platform||priceLoad.status==="idle"||priceLoad.status==="loading");

 return <div className="space-y-4">
  <nav className="grid grid-cols-2 rounded-xl bg-[#dfe5d7] p-1">
   <button type="button" onClick={()=>switchTab("collection")} aria-pressed={tab==="collection"} className={"rounded-lg px-3 py-2.5 text-sm font-black "+(tab==="collection"?"bg-[#17382e] text-white":"text-[#385347]")}>Coleção · {collection.length}</button>
   <button type="button" onClick={()=>switchTab("wishlist")} aria-pressed={tab==="wishlist"} className={"rounded-lg px-3 py-2.5 text-sm font-black "+(tab==="wishlist"?"bg-[#7f2638] text-white":"text-[#5c4650]")}>Wishlist · {wishlist.length}</button>
  </nav>
  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
   <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d7d2c6] bg-white/80 px-3"><Search className="h-4 w-4 text-slate-400"/><input aria-label={tab==="collection"?"Pesquisar nesta coleção":"Pesquisar nesta wishlist"} value={q} onChange={e=>updateState("q",e.target.value)} type="search" placeholder="Filtrar enquanto escreves…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"/></label>
   <select aria-label={tab==="collection"?"Filtrar coleção por género":"Filtrar wishlist por prioridade"} value={filter} onChange={e=>updateState("filter",e.target.value)} className="field-input"><option value="all">{tab==="collection"?"Todos os géneros":"Todas as prioridades"}</option>{(tab==="collection"?genres:priorities).map(x=><option key={x}>{x}</option>)}</select>
   <select aria-label={tab==="collection"?"Ordenar coleção":"Ordenar wishlist"} value={sort} onChange={e=>updateState("sort",e.target.value)} className="field-input">{tab==="collection"?<><option value="title">Nome A–Z</option><option value="title-desc">Nome Z–A</option><option value="value-desc">Valor ↓</option><option value="value-asc">Valor ↑</option></>:<><option value="priority">Prioridade</option><option value="title">Nome A–Z</option><option value="market-desc">Mercado ↓</option><option value="max-desc" disabled={!hasCeilings}>{hasCeilings?"Máximo ↓":"Máximo ↓ — sem valores"}</option></>}</select>
  </div>
  <div className="collection-list">
   {tab==="collection"?(cs.length?cs.map(x=><Link key={x.collectionId} prefetch={false} href={`/game/${encodeURIComponent(x.collectionId)}?from=${encodeURIComponent(returnTo)}`} onClick={saveScroll} className="collection-row"><GameArtwork collectionId={x.collectionId} title={x.title} platform={platform} className="h-24 w-20 shrink-0 rounded-xl"/><span className="min-w-0 flex-1"><strong className="block truncate text-base font-black">{x.title}</strong><span className="block truncate text-xs font-semibold text-slate-500">{x.genre?x.genre.split(",").slice(0,2).join(" · "):"Género n/d"}</span>{(x.completeness||x.condition)&&<span className="mt-1 block truncate text-[11px] font-bold text-[#466558]">{[x.completeness,x.condition].filter(Boolean).join(" · ")}</span>}</span><strong className="text-sm font-black">{x.valueEur===null?"—":formatEuro(x.valueEur)}</strong></Link>):<p className="p-5 text-sm text-slate-500">Nenhum jogo encontrado.</p>):(ws.length?ws.map(x=>{const key=wishKey(x);const lines=loading?[]:getWishlistPriceLines(x.targetVersion,priceLoad.prices[key]??null);return <Link key={x.targetId+x.title} prefetch={false} href={`/wish/${encodeURIComponent(x.targetId)}?platform=${encodeURIComponent(platform)}&title=${encodeURIComponent(x.title)}&from=${encodeURIComponent(returnTo)}`} onClick={saveScroll} className="collection-row"><WishlistArtwork title={x.title} platform={platform} artworkSrc={x.artworkSrc} className="h-24 w-20 shrink-0"/><span className="min-w-0 flex-1"><strong className="block truncate text-base font-black">{x.title}</strong><span className="text-xs font-semibold text-slate-500">{x.priority}{x.targetVersion?" · "+x.targetVersion:""}</span></span><span className="text-right text-xs" title={priceLoad.status==="error"?"Não foi possível carregar preços agora":undefined}>{loading?<><span className="block text-slate-400">PriceCharting</span><strong aria-label="A carregar preços">…</strong></>:lines.map(line=><span key={line.label} className="mb-1 block" title={line.reference?"Referência de outra condição; não corresponde ao alvo":""}><span className={"block "+(line.reference?"text-amber-700":"text-slate-400")}>{line.label}</span><strong className={line.reference?"text-amber-900":""}>{line.value===null?"—":formatEuro(line.value)}</strong></span>)}<span className="mt-1 block text-rose-500">Máx.</span><strong className="text-rose-800">{x.priceCeilingEur===null?"—":formatEuro(x.priceCeilingEur)}</strong></span></Link>}):<p className="p-5 text-sm text-slate-500">Nenhum jogo encontrado.</p>)}
  </div>
 </div>
}
