import { describe,expect,it } from "vitest";
import type { CollectionGame } from "./data/types";
import { emptyRatings } from "./game-ratings.logic";
import { hltbCoverage } from "./hltb-coverage.logic";
const game=(id:string,more:Partial<CollectionGame>={})=>({collectionId:id,title:"Game A",edition:"Standard",platform:"Nintendo Wii",keepStatus:"Collection",referenceRatings:null,...more} as CollectionGame);
const matched=(id:string)=>({...emptyRatings("2026-10-18"),hltb:{mainHours:12,gameId:id,status:"matched" as const,lookupVersion:2}});
const missing=(status:"unmatched"|"ambiguous"|"unavailable"|"error")=>({...emptyRatings("2026-10-18"),hltb:{mainHours:null,gameId:null,status,lookupVersion:2}});
describe("HLTB saved-data audit (no external requests)",()=>{
  it("counts only owned copies and accounts for every missing time",()=>{
    const games=[game("1",{referenceRatings:matched("7")}),game("2",{referenceRatings:missing("unmatched")}),game("3",{referenceRatings:missing("ambiguous")}),game("4",{referenceRatings:missing("unavailable")}),game("5",{referenceRatings:missing("error")}),game("6"),game("7",{keepStatus:"Sold"})];
    const snapshot=JSON.stringify(games),result=hltbCoverage(games);
    expect(result).toMatchObject({owned:6,withTime:1,missingCount:5,counts:{unmatched:1,ambiguous:1,unavailable:1,error:1,pending:1}});
    expect(result.counts.unmatched+result.counts.ambiguous+result.counts.unavailable+result.counts.error+result.counts.pending).toBe(result.missingCount);
    expect(JSON.stringify(games)).toBe(snapshot);
  });
  it("flags shared external ID only when names differ",()=>{
    const report=hltbCoverage([game("1",{title:"Game A",referenceRatings:matched("42")}),game("2",{title:"Game B",referenceRatings:matched("42")}),game("3",{title:"GAME A",platform:"PS2",referenceRatings:matched("42")})]);
    expect(report.sharedIds).toEqual([{id:"42",titles:["Game A","Game B"]}]);
  });
  it("legacy no-result statuses remain pending; invalid hours do not count as matches",()=>{
    const legacy={...missing("unmatched"),lookupVersion:undefined,hltb:{...missing("unmatched").hltb,lookupVersion:undefined}};
    expect(hltbCoverage([game("1",{referenceRatings:legacy})]).counts.pending).toBe(1);
    expect(hltbCoverage([game("2",{referenceRatings:{...matched("4"),hltb:{...matched("4").hltb,mainHours:0}}})]).withTime).toBe(0);
  });
});
