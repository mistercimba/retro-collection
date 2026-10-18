import type { CollectionGame, LibraryHistoryEntry } from "./data/types";
import { positiveMainHours } from "./game-ratings.logic";

const REPAIR_SUMMARY = "Referência HowLongToBeat incorreta removida para reverificação";
const BACKUP_PATTERN = /^retro-collection\/backups\/hltb-id-repair-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/;

export type RepairReference = {
  collectionId: string;
  title: string;
  platform: string;
  at: string;
  pathname: string;
  previousId: string;
  previousHours: number;
};

export function isHltbRepairHistory(entry: LibraryHistoryEntry): boolean {
  return entry.action === "collection.audit" && entry.summary === REPAIR_SUMMARY;
}

/** The path is accepted only from the app's own persisted repair history. */
export function latestRepairReference(history: readonly LibraryHistoryEntry[]): RepairReference | null {
  const matches = history.filter(isHltbRepairHistory).sort((a, b) => b.at.localeCompare(a.at));
  const entry = matches[0];
  if (!entry) return null;
  const pathnameValues = entry.details.filter(d => d.startsWith("Backup privado: "));
  const idValues = entry.details.filter(d => d.startsWith("ID HLTB anterior: "));
  const hoursValues = entry.details.filter(d => d.startsWith("Tempo anterior não validado: "));
  if (pathnameValues.length !== 1 || idValues.length !== 1 || hoursValues.length !== 1) {
    throw new Error("Registo de reparação incompleto.");
  }
  const pathname = pathnameValues[0].slice("Backup privado: ".length);
  const previousId = idValues[0].slice("ID HLTB anterior: ".length);
  const parsedHours = /^Tempo anterior não validado: (\d+(?:\.\d+)?) h$/.exec(hoursValues[0]);
  if (!BACKUP_PATTERN.test(pathname) || !/^\d+$/.test(previousId) || !parsedHours ||
    !entry.collectionId && !entry.entityId || !entry.title || !entry.platform) {
    throw new Error("Registo de reparação inválido.");
  }
  const previousHours = Number(parsedHours[1]);
  if (positiveMainHours(previousHours) === null) throw new Error("Horas anteriores inválidas.");
  return { collectionId: entry.entityId, title: entry.title, platform: entry.platform,
    at: entry.at, pathname, previousId, previousHours };
}

/** Never compare a backup until its targeted copy matches the persisted audit trail. */
export function verifyRepairBackup(copies: readonly CollectionGame[], repair: RepairReference): void {
  const target = copies.find(game => game.collectionId === repair.collectionId);
  if (!target || target.title !== repair.title || target.platform !== repair.platform ||
    target.referenceRatings?.hltb?.gameId !== repair.previousId ||
    target.referenceRatings?.hltb?.mainHours !== repair.previousHours) {
    throw new Error("Backup não corresponde à reparação registada.");
  }
}

type HltbFields = {
  hours: number | null;
  gameId: string | null;
  status: string | null;
  lookupVersion: number | null;
  owned: boolean;
};

function hltbFields(copy?: CollectionGame): HltbFields | null {
  if (!copy) return null;
  const hltb = copy.referenceRatings?.hltb;
  return {
    hours: positiveMainHours(hltb?.mainHours),
    gameId: hltb?.gameId ?? null,
    status: hltb?.status ?? null,
    lookupVersion: hltb?.lookupVersion ?? copy.referenceRatings?.lookupVersion ?? null,
    owned: copy.keepStatus === "Collection",
  };
}

export type HltbCopyChange = {
  collectionId: string;
  title: string;
  platform: string;
  before: HltbFields | null;
  after: HltbFields | null;
};

export function compareHltbBackup(
  backup: readonly CollectionGame[],
  current: readonly CollectionGame[],
) {
  const countKnown = (copies: readonly CollectionGame[]) => copies.filter(g =>
    g.keepStatus === "Collection" && positiveMainHours(g.referenceRatings?.hltb?.mainHours) !== null).length;
  const beforeCount = countKnown(backup);
  const afterCount = countKnown(current);
  const beforeById = new Map(backup.map(game => [game.collectionId, game]));
  const afterById = new Map(current.map(game => [game.collectionId, game]));
  if (beforeById.size !== backup.length || afterById.size !== current.length) {
    throw new Error("Existem IDs de cópia duplicados. Comparação cancelada.");
  }
  const changes: HltbCopyChange[] = [];
  for (const collectionId of new Set([...beforeById.keys(), ...afterById.keys()])) {
    const oldCopy = beforeById.get(collectionId), newCopy = afterById.get(collectionId);
    const before = hltbFields(oldCopy), after = hltbFields(newCopy);
    if (!before?.owned && !after?.owned) continue;
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    const game = newCopy ?? oldCopy!;
    changes.push({collectionId, title:game.title, platform:game.platform, before, after});
  }
  changes.sort((a, b) => a.title.localeCompare(b.title, "pt-PT") ||
    a.platform.localeCompare(b.platform, "pt-PT") || a.collectionId.localeCompare(b.collectionId));
  return {beforeCount, afterCount, delta:afterCount-beforeCount, changes};
}
