"use server";
import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import { authEnabled, isAuthenticated } from "./auth";
import { getFreshLibrarySnapshot, saveLibrary } from "./library-store";
import { findKnownCastlevaniaCollision, prepareCastlevaniaHltbRepair } from "./hltb-id-integrity.logic";

export async function repairKnownCastlevaniaHltb(collectionId: string): Promise<{ repaired: boolean }> {
  if (!authEnabled() || !(await isAuthenticated()))
    throw new Error("Inicia sessão para corrigir a associação.");
  if (process.env.VERCEL_ENV !== "production")
    throw new Error("Esta correção só é permitida na aplicação principal.");
  if (typeof collectionId !== "string" || !/^[\w-]{1,80}$/.test(collectionId))
    throw new Error("ID da cópia inválido.");

  const before = await getFreshLibrarySnapshot();
  const match = findKnownCastlevaniaCollision(before.library.collection)
    .find(copy => copy.collectionId === collectionId);
  if (!match) throw new Error("A associação já mudou ou não corresponde ao caso verificado.");
  const backupPath = "retro-collection/backups/hltb-id-repair-" +
    new Date().toISOString().replace(/[:.]/g, "-") + "-" + randomUUID() + ".json";
  await put(backupPath, before.rawJson, {
    access:"private",allowOverwrite:false,contentType:"application/json",cacheControlMaxAge:60,
  });
  if (!await get(backupPath, { access:"private", useCache:false }))
    throw new Error("Não foi possível verificar o backup. Nenhuma alteração efetuada.");

  const current = await getFreshLibrarySnapshot();
  if (current.sha256 !== before.sha256)
    throw new Error("A coleção mudou durante o backup. Nenhuma alteração efetuada.");
  const repaired = prepareCastlevaniaHltbRepair(current.library, collectionId);
  if (!repaired) throw new Error("A associação já não corresponde ao erro conhecido.");
  const at = new Date().toISOString();
  await saveLibrary({
    ...repaired,
    history: [{
      id:"H-" + randomUUID(),
      at,
      action:"collection.audit",
      entityId:collectionId,
      title:match.title,
      platform:match.platform,
      summary:"Referência HowLongToBeat incorreta removida para reverificação",
      details:[
        "ID HLTB anterior: " + match.wrongId,
        "Tempo anterior não validado: " + match.savedHours + " h",
        "Referência de controlo: " + match.otherTitle,
        "Backup privado: " + backupPath,
      ],
    }, ...(current.library.history??[])],
  });
  return { repaired:true };
}
