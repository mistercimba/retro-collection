import { describe, expect, it } from "vitest";
import { classifyPlanState, matchWantTarget } from "./wishlist-matching";
import type { CollectionGame, WantTarget } from "./types";

const target = (overrides: Partial<WantTarget> = {}): WantTarget => ({
  platform: "Playstation 2", priority: "Alta", targetId: "NOVO", title: "Example Game",
  reason: "", targetVersion: "PAL Standard; CIB bom estado", priceCeilingEur: null,
  status: "PESQUISAR PREÇO", notes: "", ...overrides,
});

const game = (overrides: Partial<CollectionGame> = {}): CollectionGame => ({
  collectionId: "PS2-1", catalogId: "CAT-1", itemType: "Game", title: "Example Game",
  platform: "Playstation 2", edition: "Standard", region: "PAL", language: "English",
  media: "Yes", box: "Yes", manual: "Yes", extras: "No", label: "Yes", sealed: "No",
  overallStatus: "CIB", conditionGrade: "Good", keepStatus: "Collection", acquiredDate: "",
  purchaseId: "", allocatedCostEur: null, marketValueEur: null, cexCashEur: null,
  needsReview: false, migrationConfidence: "High", notes: "", legacyName: "Example Game",
  audit: { collectionId: "PS2-1", title: "Example Game", localizedTitle: "", platform: "Playstation 2", productCode: "", region: "PAL", releaseMarket: "Europe", auditStatus: "Confirmed", auditDate: "", completeness: "CIB", functionalStatus: "Working", mediaCondition: "Good", labelCondition: "Good", boxCondition: "Good", manualCondition: "Good", packaging: "", observedLanguages: "English", missingComponents: "None", evidenceBasis: "", sources: "", auditNotes: "" },
  ...overrides,
});

describe("PLAN state", () => {
  it("recognizes the live active and inactive states used by the workbook", () => {
    expect(classifyPlanState("PESQUISAR PREÇO")).toBe("active");
    expect(classifyPlanState("WATCH")).toBe("active");
    expect(classifyPlanState("FORA DA BUYLIST PAL")).toBe("inactive");
    expect(classifyPlanState("new future status")).toBe("unknown");
  });
});

describe("variant-safe ownership matching", () => {
  it("does not treat an NTSC copy as an acquired PAL target", () => {
    const result = matchWantTarget(target(), [game({ region: "NTSC-U" })]);
    expect(result.matchState).toBe("missing");
    expect(result.ownedGame).toBeNull();
    expect(result.matchReason).toBe("owned-variant-does-not-match-target");
  });

  it("keeps a target ambiguous when a required region or condition is unknown", () => {
    const result = matchWantTarget(target(), [game({ region: "Unknown", box: "Unknown" })]);
    expect(result.matchState).toBe("ambiguous");
    expect(result.ownedGame).toBeNull();
  });

  it("uses a compatible copy when there are multiple copies, regardless of a wrong-region duplicate", () => {
    const wrongRegion = game({ collectionId: "PS2-2", region: "NTSC-U" });
    const correctRegion = game({ collectionId: "PS2-3", region: "PAL-B" });
    const result = matchWantTarget(target(), [wrongRegion, correctRegion]);
    expect(result.matchState).toBe("acquired");
    expect(result.ownedGame?.collectionId).toBe("PS2-3");
  });

  it("honors an explicit Collection/Catalog ID only after checking the target variant", () => {
    const byCatalog = matchWantTarget(target({ targetId: "CAT-1" }), [game({ region: "NTSC-U" })]);
    expect(byCatalog.matchState).toBe("missing");
    const byCollection = matchWantTarget(target({ targetId: "PS2-1" }), [game()]);
    expect(byCollection.matchState).toBe("acquired");
  });

  it("does not mark a matching copy acquired for an inactive or unknown PLAN state", () => {
    const inactive = matchWantTarget(target({ status: "FORA DA BUYLIST PAL" }), [game()]);
    const unknown = matchWantTarget(target({ status: "new future status" }), [game()]);
    expect(inactive.planState).toBe("inactive");
    expect(inactive.ownedGame).toBeNull();
    expect(unknown.planState).toBe("unknown");
    expect(unknown.matchState).toBe("ambiguous");
    expect(unknown.ownedGame).toBeNull();
  });

  it("requires matching edition and CIB contents when the target says so", () => {
    expect(matchWantTarget(target(), [game({ edition: "Platinum" })]).matchState).toBe("missing");
    expect(matchWantTarget(target(), [game({ manual: "No" })]).matchState).toBe("missing");
    expect(matchWantTarget(target(), [game({ media: "Original Cartridge" })]).matchState).toBe("acquired");
    expect(matchWantTarget(target(), [game({ media: "Unknown" })]).matchState).toBe("ambiguous");
  });

  it("uses detailed Working states but keeps assumed or untested functionality ambiguous", () => {
    const functionalTarget = target({ targetVersion: "PAL original; cartucho funcional" });
    expect(matchWantTarget(functionalTarget, [game({ audit: { ...game().audit!, functionalStatus: "Working (save verified)" } })]).matchState).toBe("acquired");
    expect(matchWantTarget(functionalTarget, [game({ audit: { ...game().audit!, functionalStatus: "Not Tested" } })]).matchState).toBe("ambiguous");
    expect(matchWantTarget(functionalTarget, [game({ audit: { ...game().audit!, functionalStatus: "Working (assumed per audit convention)" } })]).matchState).toBe("ambiguous");
  });

  it("keeps explicitly requested authenticity and label variants ambiguous without matching evidence", () => {
    const authenticity = target({ targetVersion: "Cartucho original norte-americano; autenticidade rigorosa" });
    expect(matchWantTarget(authenticity, [game({ region: "NTSC-U" })]).matchState).toBe("ambiguous");
    const blackLabel = target({ targetVersion: "PAL Black Label; CIB Good" });
    expect(matchWantTarget(blackLabel, [game()]).matchState).toBe("ambiguous");
  });

  it("understands explicit North American and JP/US alternatives without misreading a negative Europe reference", () => {
    const northAmerican = target({ targetVersion: "Cartucho original norte-americano" });
    const importable = target({ targetVersion: "Sem lançamento PAL europeu; original JP/US" });
    expect(matchWantTarget(northAmerican, [game({ region: "NTSC-U" })]).matchState).toBe("acquired");
    expect(matchWantTarget(importable, [game({ region: "NTSC-J" })]).matchState).toBe("acquired");
  });
});
