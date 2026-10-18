import type { CollectionGame } from "./data/types";
import { normalizedGameTitle, positiveMainHours } from "./game-ratings.logic";
import { pendingRatingFields } from "./ratings-maintenance.logic";

export type MissingReason = "unmatched" | "ambiguous" | "unavailable" | "error" | "pending";
export const missingReasonLabels: Record<MissingReason,string> = {
  unmatched:"Sem correspondência exata",
  ambiguous:"Correspondência ambígua",
  unavailable:"Sem horas confirmadas",
  error:"Erro técnico",
  pending:"Pesquisa válida pendente",
};
function reason(g:CollectionGame):MissingReason {
  if(g.referenceRatings?.hltb?.status==="error")return "error";
  if(pendingRatingFields(g).hltb)return "pending";
  const status=g.referenceRatings?.hltb?.status;
  if(status==="unmatched"||status==="ambiguous")return status;
  return "unavailable";
}
export function hltbCoverage(all:CollectionGame[]) {
  const owned=all.filter(g=>g.keepStatus==="Collection");
  const counts:Record<MissingReason,number>={unmatched:0,ambiguous:0,unavailable:0,error:0,pending:0};
  const missing:{id:string;title:string;platform:string;edition:string;reason:MissingReason}[]=[];
  const platforms=new Map<string,{platform:string;withTime:number;withoutTime:number}>();
  const refIds=new Map<string,Map<string,string>>();
  let withTime=0;
  for(const g of owned){
    const p=platforms.get(g.platform)??{platform:g.platform,withTime:0,withoutTime:0};
    if(positiveMainHours(g.referenceRatings?.hltb?.mainHours)!==null){
      withTime++;p.withTime++;
      const id=g.referenceRatings?.hltb?.gameId;
      if(id&&/^\d+$/.test(id)){
        const titles=refIds.get(id)??new Map<string,string>(),key=normalizedGameTitle(g.title);
        if(!titles.has(key))titles.set(key,g.title);
        refIds.set(id,titles);
      }
    }else{
      p.withoutTime++;
      const why=reason(g);counts[why]++;
      missing.push({id:g.collectionId,title:g.title,platform:g.platform,edition:g.edition,reason:why});
    }
    platforms.set(g.platform,p);
  }
  const orderedMissing=missing.sort((a,b)=>a.platform.localeCompare(b.platform,"pt-PT")||a.title.localeCompare(b.title,"pt-PT")||a.id.localeCompare(b.id));
  const byPlatform=[...platforms.values()].sort((a,b)=>b.withoutTime-a.withoutTime||a.platform.localeCompare(b.platform,"pt-PT"));
  const sharedIds=[...refIds.entries()].filter(([,titles])=>titles.size>1).map(([id,titles])=>({id,titles:[...titles.values()]})).sort((a,b)=>a.id.localeCompare(b.id));
  return {owned:owned.length,withTime,missingCount:missing.length,counts,missing:orderedMissing,byPlatform,sharedIds};
}
