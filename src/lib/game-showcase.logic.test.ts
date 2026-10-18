import {describe,it,expect} from "vitest";
import {componentPresentation,completionSummary,copyOwnershipLabel,platformBadgeLabel} from "./game-showcase.logic";
import {physicalCopyProfile} from "./physical-copy-profile.logic";

describe("truthful copy showcase",()=>{
 const wii=physicalCopyProfile("Nintendo Wii");
 it("does not fake checked manual just because overview says CIB",()=>{
  const parts=componentPresentation({media:"Yes",box:"Yes",manual:""},wii);
  expect(parts.map(x=>x.state)).toEqual(["yes","yes","unknown"]);
  expect(completionSummary(parts,0).state).toBe("unknown");
 });
 it("treats missing media and active needs as warnings",()=>{
  expect(completionSummary(componentPresentation({media:"No",box:"Yes",manual:"Yes"},wii),0).state).toBe("missing");
  expect(completionSummary(componentPresentation({media:"Yes",box:"Yes",manual:"Yes"},wii),1).state).toBe("missing");
 });
 it("respects platforms without compulsory manuals",()=>{
  const ps5=componentPresentation({media:"Yes",box:"Yes",manual:""},physicalCopyProfile("Playstation 5"));
  expect(ps5.map(x=>x.key)).toEqual(["media","box"]);
  expect(completionSummary(ps5,0)).toEqual({state:"complete",label:"100% dos componentes base confirmados"});
 });
 it("distinguishes version-specific platform badges",()=>{
  expect(platformBadgeLabel("Nintendo Wii")).toBe("Wii");
  expect(platformBadgeLabel("Nintendo Wii U")).toBe("Wii U");
  expect(platformBadgeLabel("Playstation 2")).toBe("PS2");
  expect(platformBadgeLabel("Nintendo 3DS")).toBe("Nintendo 3DS");
 });
 it("never calls sell/sold copies owned",()=>{
  expect(copyOwnershipLabel("Collection")).toBe("NA MINHA COLEÇÃO");
  expect(copyOwnershipLabel("Sell")).toBe("PARA VENDER");
  expect(copyOwnershipLabel("Sold")).toBe("VENDIDO");
 });
});
