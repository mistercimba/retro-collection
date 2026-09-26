import type { AuditRecord, CollectionGame, CollectionItem } from "./types";

const text = (value: unknown) => String(value ?? "").trim();

export function parseEuro(value: unknown): number | null {
  const raw = text(value);
  if (!raw) return null;
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const yes = (value: unknown) => /^(yes|sim|true|1)$/i.test(text(value));

export function parseCollectionRow(row: Record<string, string>): CollectionItem {
  return {
    collectionId: text(row["Collection ID"]),
    catalogId: text(row["Catalog ID"]),
    itemType: text(row["Item Type"]),
    title: text(row.Title),
    platform: text(row.Platform),
    edition: text(row.Edition),
    region: text(row.Region),
    language: text(row.Language),
    media: text(row.Media),
    box: text(row.Box),
    manual: text(row.Manual),
    extras: text(row.Extras),
    label: text(row.Label),
    sealed: text(row.Sealed),
    overallStatus: text(row["Overall Status"]),
    conditionGrade: text(row["Condition Grade"]),
    keepStatus: text(row["Keep Status"]),
    acquiredDate: text(row["Acquired Date"]),
    purchaseId: text(row["Purchase ID"]),
    allocatedCostEur: parseEuro(row["Allocated Cost EUR"]),
    marketValueEur: parseEuro(row["Market Value EUR"]),
    cexCashEur: parseEuro(row["CeX Cash EUR"]),
    needsReview: yes(row["Needs Review"]),
    migrationConfidence: text(row["Migration Confidence"]),
    notes: text(row.Notes),
    legacyName: text(row["Legacy Name"]),
  };
}

export function parseAuditRow(row: Record<string, string>): AuditRecord {
  return {
    collectionId: text(row["Collection ID"]),
    title: text(row.Title),
    localizedTitle: text(row["Localized / Label Title"]),
    platform: text(row.Platform),
    productCode: text(row["Product Code"]),
    region: text(row.Region),
    releaseMarket: text(row["Release Market"]),
    auditStatus: text(row["Audit Status"]),
    auditDate: text(row["Audit Date"]),
    completeness: text(row.Completeness),
    functionalStatus: text(row["Functional Status"]),
    mediaCondition: text(row["Media Condition"]),
    labelCondition: text(row["Label Condition"]),
    boxCondition: text(row["Box Condition"]),
    manualCondition: text(row["Manual Condition"]),
    packaging: text(row["Packaging / Sleeve"]),
    observedLanguages: text(row["Observed Languages"]),
    missingComponents: text(row["Missing Components"]),
    evidenceBasis: text(row["Evidence Basis"]),
    sources: text(row.Sources),
    auditNotes: text(row["Audit Notes"]),
  };
}

export function joinCollectionWithAudit(
  collection: CollectionItem[],
  audit: AuditRecord[],
): CollectionGame[] {
  const byId = new Map(audit.filter((entry) => entry.collectionId).map((entry) => [entry.collectionId, entry]));
  return collection.map((item) => ({ ...item, audit: byId.get(item.collectionId) ?? null }));
}
