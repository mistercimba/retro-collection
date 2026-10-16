import { describe, expect, it } from "vitest";
import { mergePhysicalAudit } from "./physical-audit.logic";
import type { AuditRecord } from "@/lib/data/types";

const old: AuditRecord = {
  collectionId: "PS2-001", title: "Test Game", platform: "Playstation 2",
  localizedTitle: "Título impresso", productCode: "SLES-12345", region: "PAL",
  releaseMarket: "Portugal", auditStatus: "Confirmed", auditDate: "26/09/2026",
  completeness: "CIB", functionalStatus: "Working", mediaCondition: "Good",
  labelCondition: "Good", boxCondition: "Fair", manualCondition: "Excellent",
  packaging: "Original", observedLanguages: "Portuguese", missingComponents: "None",
  evidenceBasis: "Fotos da minha cópia", sources: "Etiqueta", auditNotes: "Capa original",
};
const copy = { collectionId: old.collectionId, title: old.title, platform: old.platform, audit: old };
function data(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}
describe("physical audit per-copy merge", () => {
  it("patches only submitted fields, retaining historic fields and date formatting", () => {
    const { audit, changedFields } = mergePhysicalAudit(copy, data({ ean: "5601234567890", mediaCondition: "Fair" }));
    expect(changedFields).toEqual(["ean", "mediaCondition"]);
    expect(audit).toEqual({ ...old, ean: "5601234567890", mediaCondition: "Fair" });
    expect(audit?.auditDate).toBe("26/09/2026");
    expect(audit?.missingComponents).toBe("None");
    expect(audit?.auditStatus).toBe("Confirmed");
    expect(old.ean).toBeUndefined();
  });
  it("does not produce a history-worthy change for identical or absent fields", () => {
    const result = mergePhysicalAudit(copy, data({ productCode: old.productCode }));
    expect(result.changedFields).toEqual([]);
    expect(result.audit).toBe(old);
    expect(mergePhysicalAudit(copy, data({})).audit).toBe(old);
  });
  it("clears explicitly submitted observations but preserves omitted ones", () => {
    const result = mergePhysicalAudit(copy, data({ observedLanguages: "" }));
    expect(result.changedFields).toEqual(["observedLanguages"]);
    expect(result.audit?.observedLanguages).toBe("");
    expect(result.audit?.releaseMarket).toBe("Portugal");
  });
  it("does not create a blank audit or mark it confirmed without explicit input", () => {
    const fresh = { collectionId: "GC-002", title: "A", platform: "GameCube", audit: null };
    expect(mergePhysicalAudit(fresh, data({ auditStatus: "", ean: "" })).audit).toBeNull();
    const result = mergePhysicalAudit(fresh, data({ productCode: "DOL-GXXP-EUR" }));
    expect(result.audit?.auditStatus).toBe("");
    expect(result.audit?.productCode).toBe("DOL-GXXP-EUR");
    expect(result.audit?.collectionId).toBe("GC-002");
    expect(result.audit?.region).toBe("");
  });
  it("keeps same-title copies independent and does not trust client-owned identity", () => {
    const second = { collectionId: "PS2-002", title: old.title, platform: old.platform, audit: null };
    const fd = data({ productCode: "SLES-99999", collectionId: "PS2-001", title: "False title" });
    const result = mergePhysicalAudit(second, fd);
    expect(result.audit?.collectionId).toBe("PS2-002");
    expect(result.audit?.title).toBe("Test Game");
    expect(copy.audit?.productCode).toBe("SLES-12345");
  });
  it("rejects oversized or non-text fields without changing the existing record", () => {
    expect(() => mergePhysicalAudit(copy, data({ ean: "1".repeat(65) }))).toThrow(/ean/);
    const fd = new FormData();
    fd.set("ean", new Blob(["bytes"]), "bad.png");
    expect(() => mergePhysicalAudit(copy, fd)).toThrow(/inválido/);
    expect(copy.audit?.ean).toBeUndefined();
  });
});
