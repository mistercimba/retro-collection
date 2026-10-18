/**
 * Manually enrich existing copy records in the LIVE private Vercel Blob.
 *
 * Commands from a checkout with Node 22 + npm install and Vercel credentials:
 *   node --env-file=.env.local --import tsx scripts/enrich-catalog.ts --dry-run
 *   node --env-file=.env.local --import tsx scripts/enrich-catalog.ts --apply
 *
 * NEVER called by CI, build, deployment or a page request.
 */
import { get, put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CollectionGame, LibraryData, OneTimeGameRatings } from "../src/lib/data/types";
import { positiveMainHours, ratingScore, emptyRatings } from "../src/lib/game-ratings.logic";
import { collectNewGameRatings } from "../src/lib/game-ratings-provider.node";
import { missingRatingFields, mergeMissingRatings, ratingEditionKey, validatePrivateLibrary } from "../src/lib/game-ratings-enrichment.logic";
import { blockConflictingNewHltb } from "../src/lib/hltb-id-integrity.logic";

const PATH = "retro-collection/library.json";
const BACKUPS = resolve(process.cwd(), ".retro-backups");
const sleep = (ms: number) => new Promise<void>(resolveSleep => setTimeout(resolveSleep, ms));
const sha = (content: string) => createHash("sha256").update(content).digest("hex");

function usage(): never {
  console.log("Uso: node --env-file=.env.local --import tsx scripts/enrich-catalog.ts [--dry-run | --apply]");
  console.log("Por defeito faz apenas --dry-run. --apply faz backup e escreve no Blob privado UMA VEZ, no fim.");
  process.exit(0);
}
async function freshSnapshot(): Promise<{ raw: string; library: LibraryData; sha256: string }> {
  const result = await get(PATH, { access: "private", useCache: false });
  if (!result) throw new Error("O library.json privado não existe; operação cancelada.");
  const raw = await new Response(result.stream).text();
  const payload: unknown = JSON.parse(raw);
  if (!validatePrivateLibrary(payload)) throw new Error("library.json inválido ou com IDs duplicados; operação cancelada.");
  return { raw, library: payload as LibraryData, sha256: sha(raw) };
}
function beforeProviderRequest() {
  let hasRequested = false;
  return async () => {
    if (hasRequested) {
      const ms = 2000 + Math.floor(Math.random() * 1001);
      await sleep(ms);
    }
    hasRequested = true;
  };
}
async function saveBackup(snapshot: { raw: string; sha256: string }) {
  await mkdir(BACKUPS, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `library-before-ratings-${stamp}-${snapshot.sha256.slice(0,10)}.json`;
  const filename = resolve(BACKUPS, name);
  await writeFile(filename, snapshot.raw, { flag: "wx", mode: 0o600 });
  console.log(`Backup privado criado: ${filename} (SHA-256 ${snapshot.sha256})`);
}
function existingGroupRating(games: CollectionGame[], field: "hltb" | "metacritic"): OneTimeGameRatings | null {
  for (const game of games) {
    const r = game.referenceRatings;
    if (!r) continue;
    if (field === "hltb" && positiveMainHours(r.hltb?.mainHours) !== null) return r;
    if (field === "metacritic" && ratingScore(r.metacritic?.score) !== null) return r;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) usage();
  if (args.some(arg => !["--dry-run", "--apply"].includes(arg)) || (args.includes("--dry-run") && args.includes("--apply")))
    throw new Error("Usa apenas --dry-run ou --apply. Não são combináveis.");
  const apply = args.includes("--apply");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Falta BLOB_READ_WRITE_TOKEN. Importa as credenciais com vercel env pull.");
  if (apply && !process.env.RAWG_API_KEY) throw new Error("Falta RAWG_API_KEY; evita gastar a execução única sem Metacritic.");

  const initial = await freshSnapshot();
  const library = structuredClone(initial.library);

  // Each title/platform/edition is queried at most once; keep all physical copies separate.
  const groups = new Map<string, CollectionGame[]>();
  for (const game of library.collection) {
    if (game.keepStatus !== "Collection") continue; // current owned collection, not Sold/Sell
    const missing = missingRatingFields(game);
    if (!missing.hltb && !missing.metacritic) continue;
    const key = ratingEditionKey(game);
    const group = groups.get(key) ?? [];
    group.push(game);
    groups.set(key, group);
  }

  const copies = [...groups.values()].reduce((total, group) => total + group.length, 0);
  console.log(`Coleção: ${library.collection.length} registos; ${copies} cópias incompletas, ${groups.size} pesquisas distintas.`);
  console.log("O script nunca altera compras, fotografias, auditorias, wishlist ou preços.");
  if (!apply) {
    console.log("DRY RUN: sem chamadas HLTB/RAWG, sem escrita e sem alterações no Blob.");
    console.log("Para aplicar: node --env-file=.env.local --import tsx scripts/enrich-catalog.ts --apply");
    return;
  }
  if (!groups.size) {
    console.log("Todos os jogos ativos já têm valores; não há nada a guardar.");
    return;
  }
  await saveBackup(initial);
  const pace = beforeProviderRequest();
  let index = 0, hltbHits = 0, metacriticHits = 0;
  for (const group of groups.values()) {
    index++;
    const representative = group[0];
    const needsHltb = group.some(g => missingRatingFields(g).hltb);
    const needsMetacritic = group.some(g => missingRatingFields(g).metacritic);
    const reusableHltb = existingGroupRating(group, "hltb");
    const reusableMeta = existingGroupRating(group, "metacritic");
    const fetched = needsHltb && !reusableHltb || needsMetacritic && !reusableMeta
      ? await collectNewGameRatings(representative.title, representative.platform, {
          hltb: needsHltb && !reusableHltb,
          metacritic: needsMetacritic && !reusableMeta,
          beforeExternalRequest: pace,
          strict: true, // An outage must abort before any private-Blob write.
        })
      : emptyRatings(new Date().toISOString());
    const resolved: OneTimeGameRatings = {
      lookupVersion: fetched.lookupVersion,
      fetchedAt: fetched.fetchedAt,
      hltb: reusableHltb?.hltb ?? fetched.hltb,
      metacritic: reusableMeta?.metacritic ?? fetched.metacritic,
    };
    // The optional advanced CLI must enforce the same ID collision guard
    // as live additions and the in-app maintenance workflow.
    const safeResolved = blockConflictingNewHltb(library.collection, representative.title, resolved);
    if (safeResolved !== resolved) {
      console.warn("HLTB ID rejeitado: associado a outro título da coleção. Mantidas horas por confirmar.");
    }
    for (const game of group) {
      game.referenceRatings = mergeMissingRatings(game.referenceRatings, safeResolved);
    }
    if (positiveMainHours(safeResolved.hltb.mainHours) !== null) hltbHits += group.length;
    if (ratingScore(safeResolved.metacritic.score) !== null) metacriticHits += group.length;
    console.log(`[${index}/${groups.size}] ${representative.platform}: ${representative.title} — HLTB ${safeResolved.hltb.mainHours ?? "—"} h · Metacritic ${safeResolved.metacritic.score ?? "—"}`);
  }

  // The live web app can edit the same Blob. Never overwrite a newer version.
  const beforeWrite = await freshSnapshot();
  if (beforeWrite.sha256 !== initial.sha256) {
    throw new Error("library.json mudou durante a pesquisa. Nada foi gravado. Faz novo dry-run e repete depois de verificares o backup.");
  }
  library.updatedAt = new Date().toISOString();
  await put(PATH, JSON.stringify(library), {
    access: "private", allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60,
  });
  const verify = await freshSnapshot();
  if (verify.library.updatedAt !== library.updatedAt ||
      verify.library.collection.length !== library.collection.length) {
    throw new Error("A gravação não foi confirmada. Confere o Blob e o backup antes de repetir.");
  }
  console.log(`Concluído. ${copies} cópias avaliadas; HLTB encontrado em ${hltbHits}, Metacritic em ${metacriticHits}.`);
  console.log("O site pode demorar até 5 minutos a refletir os dados, por causa da cache da aplicação.");
}
main().catch(error => {
  console.error("Enriquecimento CANCELADO:", error instanceof Error ? error.message : "Erro desconhecido");
  process.exitCode = 1;
});
