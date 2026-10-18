import type { AuditRecord, CollectionGame } from "@/lib/data/types";

/**
 * Editable observations from a particular physical copy. The catalogue identity,
 * component ownership/checklist and untouched legacy audit fields remain separate.
 */
export const PHYSICAL_AUDIT_FIELD_LIMITS = {
  auditStatus: 80,
  auditDate: 60, // allow historical DD/MM/YYYY dates unchanged
  localizedTitle: 200,
  productCode: 120,
  ean: 64,
  releaseMarket: 160,
  observedLanguages: 250,
  functionalStatus: 100,
  mediaCondition: 100,
  labelCondition: 100,
  boxCondition: 100,
  manualCondition: 100,
  packaging: 250,
  evidenceBasis: 600,
  sources: 1400,
  auditNotes: 4000,
} as const satisfies Partial<Record<keyof AuditRecord, number>>;

export type PhysicalAuditField = keyof typeof PHYSICAL_AUDIT_FIELD_LIMITS;

export function mergePhysicalAudit(
  copy: Pick<CollectionGame, "collectionId" | "title" | "platform" | "audit">,
  form: FormData,
): { audit: AuditRecord | null; changedFields: PhysicalAuditField[] } {
  const existing = copy.audit;
  const next: AuditRecord = {
    localizedTitle: "",
    productCode: "",
    region: "",
    releaseMarket: "",
    auditStatus: "",
    auditDate: "",
    completeness: "",
    functionalStatus: "",
    mediaCondition: "",
    labelCondition: "",
    boxCondition: "",
    manualCondition: "",
    packaging: "",
    observedLanguages: "",
    missingComponents: "",
    evidenceBasis: "",
    sources: "",
    auditNotes: "",
    ...existing,
    // These three fields belong to this physical copy, never to the client.
    collectionId: copy.collectionId,
    title: copy.title,
    platform: copy.platform,
  };
  const changedFields: PhysicalAuditField[] = [];
  for (const field of Object.keys(PHYSICAL_AUDIT_FIELD_LIMITS) as PhysicalAuditField[]) {
    if (!form.has(field)) continue;
    const raw = form.get(field);
    if (typeof raw !== "string") throw new Error("Campo de auditoria inválido.");
    const value = raw.trim();
    if (value.length > PHYSICAL_AUDIT_FIELD_LIMITS[field]) {
      throw new Error(`O campo ${field} excede o comprimento permitido.`);
    }
    if ((next[field] ?? "") !== value) {
      next[field] = value;
      changedFields.push(field);
    }
  }
  return {
    audit: changedFields.length > 0 ? next : existing,
    changedFields,
  };
}
