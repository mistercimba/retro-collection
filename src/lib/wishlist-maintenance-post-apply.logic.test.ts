import { describe, expect, it } from "vitest";
import type { WishlistMaintenanceLibrary, WishlistMaintenancePlan } from "../../scripts/wishlist-maintenance-logic.mjs";
import { buildWishlistPostCleanupAudit } from "./wishlist-maintenance-post-apply.logic";
import approvedPlan from "../../data/wishlist-maintenance-2026-10-08.json";

const plan = approvedPlan as WishlistMaintenancePlan;
function fixture(): WishlistMaintenanceLibrary {
  const targets = plan.operations.filter((operation) => operation.type === "split")
    .flatMap((operation) => operation.titles.map((title, index) => ({
      targetId: "NEW-" + operation.match.platform + "-" + index + title,
      platform: operation.match.platform, title, priority: "Média", reason: "",
      targetVersion: "PAL", priceCeilingEur: null, status: "ACTIVE",
      notes: operation.notesByTitle?.[title] ?? "",
    })));
  const history = targets.map((target) => ({
    id: "H-" + target.targetId, at: "2026-10-13T21:03:26.873Z",
    action: "wishlist.add", entityId: target.targetId, title: target.title,
    platform: target.platform, summary: "split", details: [],
  }));
  for(const operation of plan.operations) if(operation.type === "split") {
    history.push({id:"H-" + operation.match.title,at:"2026-10-13T21:03:26.873Z",
      action:"wishlist.remove",entityId:"NOVO",title:operation.match.title,
      platform:operation.match.platform,summary:"split",details:[]});
  }
  return {schemaVersion:1, updatedAt:"2026-10-13T21:03:26.873Z",
    collection:[],wishlist:targets,purchases:[],valuations:[],history};
}
describe("Wishlist post-apply audit uses actual persisted data", () => {
  it("verifies six exact notes and matching history without mutations", () => {
    const source=fixture(), original=structuredClone(source);
    const audit=buildWishlistPostCleanupAudit(source,plan);
    expect(audit.splitEntries).toHaveLength(6);
    expect(audit.notesVerified).toBe(true);
    expect(audit.verifiedNotesCount).toBe(6);
    expect(audit.historyRecorded).toBe(true);
    expect(source).toEqual(original);
  });
  it("does not mistake approved plan notes for persisted notes", () => {
    const source=fixture();
    source.wishlist[0].notes="Missing real note";
    const audit=buildWishlistPostCleanupAudit(source,plan);
    expect(audit.notesVerified).toBe(false);
    expect(audit.verifiedNotesCount).toBe(5);
  });
  it("detects missing or duplicated targets and absent history", () => {
    const source=fixture();
    source.wishlist.push(structuredClone(source.wishlist[0]));
    source.history=[];
    const audit=buildWishlistPostCleanupAudit(source,plan);
    expect(audit.notesVerified).toBe(false);
    expect(audit.historyRecorded).toBe(false);
    expect(audit.splitEntries[0].matches).toBe(2);
    expect(audit.verifiedNewTargetHistoryCount).toBe(0);
  });
});
