import "server-only";
import { get } from "@vercel/blob";
import { authEnabled, isAuthenticated } from "./auth";
import { getFreshLibrary } from "./library-store";
import { validatePrivateLibrary } from "./game-ratings-enrichment.logic";
import { compareHltbBackup, latestRepairReference, verifyRepairBackup } from "./hltb-repair-backup-diff.logic";

export async function loadHltbRepairBackupDiff() {
  // Fail closed if the single-password private app is not configured.
  if (!authEnabled() || !(await isAuthenticated())) {
    throw new Error("Diagnóstico indisponível sem autenticação.");
  }
  // Always use a fresh production/shared-store read, never a cached snapshot.
  const current = await getFreshLibrary();
  const repair = latestRepairReference(current.history);
  if (!repair) return null;

  const blob = await get(repair.pathname, { access: "private", useCache: false });
  if (!blob) throw new Error("Backup da reparação não encontrado.");
  const raw = await new Response(blob.stream).text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Backup da reparação inválido.");
  }
  if (!validatePrivateLibrary(parsed)) throw new Error("Backup da reparação inválido.");
  verifyRepairBackup(parsed.collection, repair);
  return {
    repairAt: repair.at,
    comparedAt: current.updatedAt,
    repairTitle: repair.title,
    ...compareHltbBackup(parsed.collection, current.collection),
  };
}
