import { describe, expect, it } from "vitest";
import { applyRatingsTask, nextRatingsTask, pendingRatingFields, ratingsOverview } from "./ratings-maintenance.logic";
import { emptyRatings } from "./game-ratings.logic";
import type { CollectionGame } from "./data/types";
const copy=(id:string,extra:Partial<CollectionGame>={})=>({collectionId:id,title:"Resident Evil 4",
 platform:"Nintendo Wii",edition:"Standard",keepStatus:"Collection",referenceRatings:null,...extra} as CollectionGame);
const fetched={...emptyRatings("2026-10-18"),hltb:{mainHours:15.5,gameId:"123",status:"matched" as const},
 metacritic:{score:91,url:null,rawgUrl:"https://rawg.io/games/test",status:"matched" as const}};
describe("in-app ratings maintenance",()=>{
 it("counts owned unattempted copies, grouping duplicates",()=>{
  const all=[copy("A"),copy("B"),copy("C",{platform:"Playstation 2"}),copy("D",{keepStatus:"Sold"})];
  expect(ratingsOverview(all)).toMatchObject({ownedCopies:3,pendingCopies:3,pendingGroups:2});
  expect(nextRatingsTask(all)?.ids).toEqual(["A","B"]);
 });
 it("does not requery already attempted missing data",()=>{
  const r={...fetched,metacritic:{score:null,url:null,rawgUrl:null,status:"unmatched" as const}};
  const g=copy("A",{referenceRatings:r});
  expect(pendingRatingFields(g)).toEqual({hltb:false,metacritic:false});
  expect(applyRatingsTask(g,fetched,{hltb:null,metacritic:null})).toBe(g);
 });
 it("fills missing values but never overwrites existing ones",()=>{
  const a=applyRatingsTask(copy("A"),fetched,{hltb:null,metacritic:null});
  expect(a.referenceRatings?.metacritic.score).toBe(91);
  expect(a.referenceRatings?.hltb.mainHours).toBe(15.5);
 });
 it("reuses scores only within same title, platform and edition",()=>{
  const task=nextRatingsTask([copy("A",{referenceRatings:fetched}),copy("B")]);
  expect(task?.lookupHltb).toBe(false);
  expect(task?.lookupMetacritic).toBe(false);
  const filled=applyRatingsTask(copy("B"),emptyRatings("2026-10-18"),{hltb:task!.knownHltb,metacritic:task!.knownMetacritic});
  expect(filled.referenceRatings?.metacritic.score).toBe(91);
  expect(nextRatingsTask([copy("A",{referenceRatings:fetched}),copy("C",{edition:"Collector"})])?.lookupHltb).toBe(true);
 });
});
