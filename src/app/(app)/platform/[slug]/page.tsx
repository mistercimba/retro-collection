import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {notFound} from "next/navigation";
import {PlatformLibraryBrowser} from "@/components/platform-library-browser";
import {getCollectionGames,getWantlist} from "@/lib/data/collection-service";
import {displayPlatform,platformFromSlug,platformReleaseYear} from "@/lib/data/platforms";
import {enrichGameList} from "@/lib/game-list-data";
import {getPricechartingGuides} from "@/lib/pricecharting-catalog";

export default async function PlatformPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const[{slug},query,collectionGames,wantlist]=await Promise.all([params,searchParams,getCollectionGames(),getWantlist()]);
 const known=[...new Set([...collectionGames.map(x=>x.platform),...wantlist.map(x=>x.platform)])];
 const platform=platformFromSlug(slug,known);
 if(!platform) notFound();

 const rawGames=collectionGames.filter(x=>x.platform===platform);
 const targets=wantlist.filter(x=>x.platform===platform&&x.planState!=="inactive"&&x.matchState!=="acquired");
 const[games,guides]=await Promise.all([
  enrichGameList(rawGames),
  getPricechartingGuides(targets.map(x=>({key:x.targetId+":"+x.title,platform:x.platform,title:x.title,edition:x.targetVersion})))
 ]);
 const collection=games.map(x=>({collectionId:x.collectionId,title:x.title,genre:x.genre,valueEur:x.currentValueEur,condition:x.conditionGrade,completeness:x.overallStatus}));
 const wishlist=targets.map(x=>({targetId:x.targetId,title:x.title,priority:x.priority,targetVersion:x.targetVersion,priceCeilingEur:x.priceCeilingEur,guide:guides.get(x.targetId+":"+x.title)??{looseEur:null,cibEur:null,newEur:null,source:"Preço indisponível",date:"",productUrl:""}}));

 return <div className="space-y-5 pb-8">
  <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#17382e]"><ArrowLeft className="h-3.5 w-3.5"/>Consolas</Link>
  <header className="collection-hero">
   <p className="eyebrow">PLATAFORMA · {platformReleaseYear(platform)<9990?platformReleaseYear(platform):"—"}</p>
   <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{displayPlatform(platform)}</h1>
   <p className="mt-1 text-sm font-semibold text-slate-500">{collection.length} jogos na coleção · {wishlist.length} na wishlist</p>
  </header>
  <PlatformLibraryBrowser slug={slug} platform={platform} initialTab={query.tab==="wishlist"?"wishlist":"collection"} collection={collection} wishlist={wishlist}/>
 </div>;
}
