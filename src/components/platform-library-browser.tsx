"use client";
import Link from "next/link";
import {Search} from "lucide-react";
import {useMemo,useState} from "react";
import {GameArtwork} from "@/components/artwork";
import {WishlistArtwork} from "@/components/wishlist-artwork";
import {formatEuro} from "@/lib/format";
import type {PriceGuide} from "@/lib/pricecharting-catalog";

type C={collectionId:string;title:string;genre:string;valueEur:number|null;condition:string;completeness:string};
type W={targetId:string;title:string;priority:string;targetVersion:string;priceCeilingEur:number|null;guide:PriceGuide};
const rank=(v:string)=>({grail:0,alta:1,"média":2,media:2,baixa:3}[v.toLocaleLowerCase("pt-PT")]??9);
const market=(v:W)=>v.guide.cibEur??v.guide.looseEur??v.guide.newEur;

export function PlatformLibraryBrowser({slug,platform,initialTab,collection,wishlist}:{slug:string;platform:string;initialTab:"collection"|"wishlist";collection:C[];wishlist:W[]}){
 const[tab,setTab]=useState(initialTab),[q,setQ]=useState(""),[sort,setSort]=useState(initialTab==="wishlist"?"priority":"title"),[filter,setFilter]=useState("all");
 const switchTab=(next:"collection"|"wishlist")=>{setTab(next);setQ("");setFilter("all");setSort(next==="wishlist"?"priority":"title");history.replaceState(history.state,"",next==="wishlist"?`/platform/${slug}?tab=wishlist`:`/platform/${slug}`)};
 const genres=useMemo(()=>[...new Set(collection.flatMap(x=>x.genre.split(",").map(y=>y.trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,"pt-PT")),[collection]);
 const priorities=useMemo(()=>[...new Set(wishlist.map(x=>x.priority).filter(Boolean))].sort((a,b)=>rank(a)-rank(b)),[wishlist]);
 const cs=useMemo(()=>collection.filter(x=>(!q||x.title.toLowerCase().includes(q.toLowerCase()))&&(filter==="all"||x.genre.split(",").map(y=>y.trim()).includes(filter))).sort((a,b)=>sort==="title-desc"?b.title.localeCompare(a.title,"pt-PT"):sort==="value-desc"?(b.valueEur??-1)-(a.valueEur??-1):sort==="value-asc"?(a.valueEur??999999)-(b.valueEur??999999):a.title.localeCompare(b.title,"pt-PT")),[collection,q,filter,sort]);
 const ws=useMemo(()=>wishlist.filter(x=>(!q||x.title.toLowerCase().includes(q.toLowerCase()))&&(filter==="all"||x.priority===filter)).sort((a,b)=>sort==="title"?a.title.localeCompare(b.title,"pt-PT"):sort==="market-desc"?(market(b)??-1)-(market(a)??-1):sort==="max-desc"?(b.priceCeilingEur??-1)-(a.priceCeilingEur??-1):rank(a.priority)-rank(b.priority)||a.title.localeCompare(b.title,"pt-PT")),[wishlist,q,filter,sort]);
 return <div className="space-y-4">
  <nav className="grid grid-cols-2 rounded-xl bg-[#dfe5d7] p-1">
   <button onClick={()=>switchTab("collection")} className={"rounded-lg px-3 py-2.5 text-sm font-black "+(tab==="collection"?"bg-[#17382e] text-white":"text-[#385347]")}>Coleção · {collection.length}</button>
   <button onClick={()=>switchTab("wishlist")} className={"rounded-lg px-3 py-2.5 text-sm font-black "+(tab==="wishlist"?"bg-[#7f2638] text-white":"text-[#5c4650]")}>Wishlist · {wishlist.length}</button>
  </nav>
  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
   <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d7d2c6] bg-white/80 px-3"><Search className="h-4 w-4 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} type="search" placeholder="Filtrar enquanto escreves…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"/></label>
   <select value={filter} onChange={e=>setFilter(e.target.value)} className="field-input"><option value="all">{tab==="collection"?"Todos os géneros":"Todas as prioridades"}</option>{(tab==="collection"?genres:priorities).map(x=><option key={x}>{x}</option>)}</select>
   <select value={sort} onChange={e=>setSort(e.target.value)} className="field-input">{tab==="collection"?<><option value="title">Nome A–Z</option><option value="title-desc">Nome Z–A</option><option value="value-desc">Valor ↓</option><option value="value-asc">Valor ↑</option></>:<><option value="priority">Prioridade</option><option value="title">Nome A–Z</option><option value="market-desc">Mercado ↓</option><option value="max-desc">Máximo ↓</option></>}</select>
  </div>
  <div className="collection-list">
   {tab==="collection"?(cs.length?cs.map(x=><Link key={x.collectionId} href={`/game/${encodeURIComponent(x.collectionId)}?from=${encodeURIComponent("/platform/"+slug)}`} className="collection-row"><GameArtwork collectionId={x.collectionId} title={x.title} platform={platform} className="h-24 w-20 shrink-0 rounded-xl"/><span className="min-w-0 flex-1"><strong className="block truncate text-base font-black">{x.title}</strong><span className="text-xs font-semibold text-slate-500">{x.genre?x.genre.split(",").slice(0,2).join(" · "):"Género n/d"}</span></span><strong className="text-sm font-black">{x.valueEur===null?"—":formatEuro(x.valueEur)}</strong></Link>):<p className="p-5 text-sm text-slate-500">Nenhum jogo encontrado.</p>):(ws.length?ws.map(x=>{const mv=market(x);return <Link key={x.targetId+x.title} href={`/wish/${encodeURIComponent(x.targetId)}?from=${encodeURIComponent("/platform/"+slug+"?tab=wishlist")}`} className="collection-row"><WishlistArtwork title={x.title} platform={platform} className="h-24 w-20 shrink-0"/><span className="min-w-0 flex-1"><strong className="block truncate text-base font-black">{x.title}</strong><span className="text-xs font-semibold text-slate-500">{x.priority}{x.targetVersion?" · "+x.targetVersion:""}</span></span><span className="text-right text-xs"><span className="block text-slate-400">PC CIB</span><strong>{mv===null?"—":formatEuro(mv)}</strong><span className="mt-1 block text-rose-500">Máx.</span><strong className="text-rose-800">{x.priceCeilingEur===null?"—":formatEuro(x.priceCeilingEur)}</strong></span></Link>}):<p className="p-5 text-sm text-slate-500">Nenhum jogo encontrado.</p>)}
  </div>
 </div>
}
