"use server";
import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import { authEnabled, isAuthenticated } from "./auth";
import { getFreshLibrarySnapshot, saveLibrary } from "./library-store";
import { collectNewGameRatings } from "./new-game-ratings";
import { RatingsProviderFailure } from "./game-ratings-provider.node";
import { emptyRatings } from "./game-ratings.logic";
import { applyRatingsTask, nextRatingsTask, ratingsOverview, type RatingsSource } from "./ratings-maintenance.logic";

const BACKUP_ROOT="retro-collection/backups/ratings-";
const backupPattern=/^retro-collection\/backups\/ratings-[0-9TZ-]+-[a-f0-9-]{36}\.json$/;
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
async function ensureMaintenanceAuthorized() {
  if(!authEnabled()||!(await isAuthenticated())) throw new Error("Inicia sessão para atualizar a coleção.");
  if(process.env.VERCEL_ENV!=="production") throw new Error("A atualização só é permitida na aplicação principal.");
}
function validSource(value: unknown): value is RatingsSource {
  return value === "hltb" || value === "metacritic";
}
export async function beginRatingsMaintenance(source: RatingsSource) {
  if (!validSource(source)) throw new Error("Fonte inválida.");
  await ensureMaintenanceAuthorized();
  const snapshot=await getFreshLibrarySnapshot();
  const overview=ratingsOverview(snapshot.library.collection);
  if(!nextRatingsTask(snapshot.library.collection, source))return {backupPath:null,updatedAt:snapshot.library.updatedAt,overview};
  const backupPath=BACKUP_ROOT+new Date().toISOString().replace(/[:.]/g,"-")+"-"+randomUUID()+".json";
  await put(backupPath,snapshot.rawJson,{access:"private",allowOverwrite:false,
    contentType:"application/json",cacheControlMaxAge:60});
  return {backupPath,updatedAt:snapshot.library.updatedAt,overview};
}
export async function enrichNextRatingsGroup(request:{backupPath:string;expectedUpdatedAt:string;source:RatingsSource}) {
  await ensureMaintenanceAuthorized();
  if(!request||!validSource(request.source)||typeof request.backupPath!=="string"||!backupPattern.test(request.backupPath)||
    typeof request.expectedUpdatedAt!=="string")throw new Error("Sessão de atualização inválida.");
  const exists=await get(request.backupPath,{access:"private",useCache:false});
  if(!exists)throw new Error("Backup privado indisponível: operação interrompida.");
  const before=await getFreshLibrarySnapshot();
  if(before.library.updatedAt!==request.expectedUpdatedAt)
    throw new Error("A coleção foi editada entretanto; a atualização foi interrompida por segurança.");
  const task=nextRatingsTask(before.library.collection, request.source);
  if(!task)return {updatedAt:before.library.updatedAt,overview:ratingsOverview(before.library.collection),done:true,processed:null};
  let requests=0;
  const pace=async()=>{
    if(requests>0)await sleep(2000+Math.floor(Math.random()*1001));
    requests++;
  };
  let fetched;
  try {
    fetched=task.lookupHltb||task.lookupMetacritic
      ?await collectNewGameRatings(task.title,task.platform,{
        hltb:request.source==="hltb"&&task.lookupHltb,
        metacritic:request.source==="metacritic"&&task.lookupMetacritic,
        beforeExternalRequest:pace,strict:true,
      })
      :emptyRatings(new Date().toISOString());
  } catch (error) {
    if (error instanceof RatingsProviderFailure) {
      // Next.js hides uncaught server action exception messages in production.
      // Return only a safe category, never provider URLs, auth tokens or raw data.
      return {
        updatedAt:before.library.updatedAt,
        overview:ratingsOverview(before.library.collection),
        done:false,
        processed:null,
        failure:error.message,
      };
    }
    throw error;
  }
  const fresh=await getFreshLibrarySnapshot();
  if(fresh.sha256!==before.sha256)
    throw new Error("A coleção mudou durante as consultas. Não foram gravados os resultados deste jogo.");
  const ids=new Set(task.ids);
  const data={...fresh.library,collection:fresh.library.collection.map(game=>
    ids.has(game.collectionId)?applyRatingsTask(game,fetched,{
      hltb:task.knownHltb,metacritic:task.knownMetacritic,
    },request.source):game)};
  const saved=await saveLibrary(data);
  const overview=ratingsOverview(saved.collection);
  return {updatedAt:saved.updatedAt,overview,
    done:!nextRatingsTask(saved.collection,request.source),
    processed:{title:task.title,platform:task.platform,copies:task.ids.length}};
}
