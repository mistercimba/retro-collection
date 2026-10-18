import "server-only";
import { get } from "@vercel/blob";
import { authEnabled, isAuthenticated } from "./auth";
import { getFreshLibrary } from "./library-store";
import { validatePrivateLibrary } from "./game-ratings-enrichment.logic";
import { compareHltbBackup, latestRepairReference, verifyRepairBackup } from "./hltb-repair-backup-diff.logic";

export type HltbAuditErrorCode =
  | "AUTH_REQUIRED"
  | "CURRENT_LIBRARY_READ"
  | "REPAIR_HISTORY_INVALID"
  | "BACKUP_ACCESS"
  | "BACKUP_MISSING"
  | "BACKUP_JSON_INVALID"
  | "BACKUP_SCHEMA_INVALID"
  | "BACKUP_MISMATCH"
  | "COMPARISON_FAILED";

export class HltbAuditError extends Error {
  constructor(readonly code: HltbAuditErrorCode) {
    super("Auditoria HLTB indisponível.");
    this.name = "HltbAuditError";
  }
}

export async function loadHltbRepairBackupDiff() {
  // No raw upstream exceptions, private paths, JSON or provider data are surfaced.
  if (!authEnabled() || !(await isAuthenticated())) {
    throw new HltbAuditError("AUTH_REQUIRED");
  }

  let current: Awaited<ReturnType<typeof getFreshLibrary>>;
  try {
    current = await getFreshLibrary();
  } catch {
    throw new HltbAuditError("CURRENT_LIBRARY_READ");
  }
  let repair: ReturnType<typeof latestRepairReference>;
  try {
    repair = latestRepairReference(current.history);
  } catch {
    throw new HltbAuditError("REPAIR_HISTORY_INVALID");
  }
  if (!repair) return null;

  let blob: Awaited<ReturnType<typeof get>>;
  try {
    blob = await get(repair.pathname, { access: "private", useCache: false });
  } catch {
    throw new HltbAuditError("BACKUP_ACCESS");
  }
  if (!blob) throw new HltbAuditError("BACKUP_MISSING");

  let raw: string;
  try {
    raw = await new Response(blob.stream).text();
  } catch {
    throw new HltbAuditError("BACKUP_ACCESS");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HltbAuditError("BACKUP_JSON_INVALID");
  }
  if (!validatePrivateLibrary(parsed)) throw new HltbAuditError("BACKUP_SCHEMA_INVALID");
  try {
    verifyRepairBackup(parsed.collection, repair);
  } catch {
    throw new HltbAuditError("BACKUP_MISMATCH");
  }
  try {
    return {
      repairAt: repair.at,
      comparedAt: current.updatedAt,
      repairTitle: repair.title,
      ...compareHltbBackup(parsed.collection, current.collection),
    };
  } catch {
    throw new HltbAuditError("COMPARISON_FAILED");
  }
}
