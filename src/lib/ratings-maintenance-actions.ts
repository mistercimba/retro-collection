"use server";
import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import { authEnabled, isAuthenticated } from "./auth";
import { getFreshLibrarySnapshot, saveLibrary } from "./library-store";
import { collectNewGameRatings } from "./new-game-ratings";
import { emptyRatings } from "./game-ratings.logic";
import { applyRatingsTask, nextRatingsTask, ratingsOverview } from "./ratings-maintenance.logic";

const BACKUP_ROOT="retro-collection/backups/ratings-";
const backupPattern=/^retro-collection\/backups\/ratings-[0-9TZ-]+-[a-f0-9-]{36}\.json$/;
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
async function ensureMaintenanceAuthorized() {
  if(!authEnabled()||!(await isAuthenticated())) throw new Error("Inicia sessão para atualizar a coleção.");
  if(process.env.VERCEL_ENV!=="production") throw new Error("A atualização só é permitida na aplicação principal.");
}
export async function beginRatingsMaintenance() {
  await ensureMaintenanceAuthorized();
  const snapshot=await getFreshLibrarySnapshot();
  const overview=ratingsOverview(snapshot.library.collection);
  if(!overview.pendingGroups)return {backupPath:null,updatedAt:snapshot.library.updatedAt,overview};
  const backupPath=BACKUP_ROOT+new Date().toISOString().replace(/[:.]/g,"-")+"-"+randomUUID()+".json";
  await put(backupPath,snapshot.rawJson,{access:"private",allowOverwrite:false,
    contentType:"application/json",cacheControlMaxAge:60});
  return {backupPath,updatedAt:snapshot.library.updatedAt,overview};
}
export async function enrichNextRatingsGroup(request:{backupPath:string;expectedUpdatedAt:string}) {
  await ensureMaintenanceAuthorized();
  if(!request||typeof request.backupPath!=="string"||!backupPattern.test(request.backupPath)||
    typeof request.expectedUpdatedAt!=="string")throw new Error("Sessão de atualização inválida.");
  const exists=await get(request.backupPath,{access:"private",useCache:false});
  if(!exists)throw new Error("Backup privado indisponível: operação interrompida.");
  const before=await getFreshLibrarySnapshot();
  if(before.library.updatedAt!==request.expectedUpdatedAt)
    throw new Error("A coleção foi editada entretanto; a atualização foi interrompida por segurança.");
  const task=nextRatingsTask(before.library.collection);
  if(!task)return {updatedAt:before.library.updatedAt,overview:ratingsOverview(before.library.collection),done:true,processed:null};
  let requests=0;
  const pace=async()=>{
    if(requests>0)await sleep(2000+Math.floor(Math.random()*1001));
    requests++;
  };
  const fetched=task.lookupHltb||task.lookupMetacritic
    ?await collectNewGameRatings(task.title,task.platform,{
      hltb:task.lookupHltb,metacritic:task.lookupMetacritic,beforeExternalRequest:pace,strict:true,
    })
    :emptyRatings(new Date().toISOString());
  const fresh=await getFreshLibrarySnapshot();
  if(fresh.sha256!==before.sha256)
    throw new Error("A coleção mudou durante as consultas. Não foram gravados os resultados deste jogo.");
  const ids=new Set(task.ids);
  const data={...fresh.library,collection:fresh.library.collection.map(game=>
    ids.has(game.collectionId)?applyRatingsTask(game,fetched,{
      hltb:task.knownHltb,metacritic:task.knownMetacritic,
    }):game)};
  const saved=await saveLibrary(data);
  const overview=ratingsOverview(saved.collection);
  return {updatedAt:saved.updatedAt,overview,done:overview.pendingGroups===0,
    processed:{title:task.title,platform:task.platform,copies:task.ids.length}};
}
