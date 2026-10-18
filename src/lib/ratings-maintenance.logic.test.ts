import { describe, expect, it } from "vitest";
import { applyRatingsTask, isTransientHltbFailure, nextRatingsTask, pendingRatingFields, ratingsOverview, retryTransientHltb, shouldPauseAfterOutages } from "./ratings-maintenance.logic";
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

describe("recover incorrectly marked previous attempts",()=>{
 it("retries v1 unavailable and unmatched but preserves all saved scores",()=>{
  const copy=(id:string, ratings: CollectionGame["referenceRatings"])=>({collectionId:id,title:"Nioh",platform:"Playstation 4",edition:"Standard",keepStatus:"Collection",referenceRatings:ratings} as CollectionGame);
  const legacy={...emptyRatings("2026-10-18"),lookupVersion:undefined,
    hltb:{mainHours:null,gameId:null,status:"unavailable" as const},
    metacritic:{score:85,url:null,rawgUrl:null,status:"matched" as const}};
  expect(pendingRatingFields(copy("1",legacy))).toEqual({hltb:true,metacritic:false});
  const fresh={...emptyRatings("2026-10-18"),hltb:{mainHours:null,gameId:null,status:"unmatched" as const}};
  expect(pendingRatingFields(copy("2",fresh))).toEqual({hltb:false,metacritic:false});
  const fail={...emptyRatings("2026-10-18"),hltb:{mainHours:null,gameId:null,status:"error" as const}};
  expect(pendingRatingFields(copy("3",fail)).hltb).toBe(true);
  const updated=applyRatingsTask(copy("4",legacy), {...emptyRatings("2026-10-18"), hltb:{mainHours:23.6,gameId:"114",status:"matched"}}, {hltb:null, metacritic:null});
  expect(updated.referenceRatings?.lookupVersion).toBe(2);
  expect(updated.referenceRatings?.hltb.mainHours).toBe(23.6);
  expect(updated.referenceRatings?.metacritic.score).toBe(85);
 });
});

describe("provider-isolated backfill regression",()=>{
 it("HLTB maintenance never queries or marks RAWG as attempted",()=>{
  const legacy={...emptyRatings("2026-10-18"),lookupVersion:undefined,
   hltb:{mainHours:null,gameId:null,status:"unavailable" as const},
   metacritic:{score:null,url:null,rawgUrl:null,status:"unmatched" as const}};
  const game=copy("A",{referenceRatings:legacy});
  const task=nextRatingsTask([game],"hltb");
  expect(task?.lookupHltb).toBe(true);
  expect(task?.lookupMetacritic).toBe(false);
  const fetched={...emptyRatings("2026-10-18"),hltb:{mainHours:24,gameId:"34",status:"matched" as const}};
  const next=applyRatingsTask(game,fetched,{hltb:null,metacritic:null},"hltb");
  expect(next.referenceRatings?.hltb.mainHours).toBe(24);
  expect(next.referenceRatings?.metacritic).toEqual(legacy.metacritic);
  expect(next.referenceRatings?.lookupVersion).toBeUndefined();
  expect(next.referenceRatings?.hltb.lookupVersion).toBe(2);
  expect(pendingRatingFields(next)).toEqual({hltb:false,metacritic:true});
  expect(nextRatingsTask([next],"hltb")).toBeNull();
  expect(nextRatingsTask([next],"metacritic")?.lookupMetacritic).toBe(true);
 });
 it("RAWG maintenance never queries or overwrites an existing HLTB result",()=>{
  const legacy={...emptyRatings("2026-10-18"),lookupVersion:undefined,
   hltb:{mainHours:23.6,gameId:"28",status:"matched" as const},
   metacritic:{score:null,url:null,rawgUrl:null,status:"unmatched" as const}};
  const game=copy("B",{referenceRatings:legacy});
  const task=nextRatingsTask([game],"metacritic");
  expect(task?.lookupHltb).toBe(false);
  expect(task?.lookupMetacritic).toBe(true);
  const fetched={...emptyRatings("2026-10-18"),
    metacritic:{score:91,url:null,rawgUrl:"https://rawg.io/games/test",status:"matched" as const}};
  const next=applyRatingsTask(game,fetched,{hltb:null,metacritic:null},"metacritic");
  expect(next.referenceRatings?.hltb).toEqual(legacy.hltb);
  expect(next.referenceRatings?.metacritic.score).toBe(91);
  expect(nextRatingsTask([next],"metacritic")).toBeNull();
 });
 it("independently reports pending groups and counts for both providers",()=>{
  const found=copy("A",{referenceRatings:fetched});
  const hltbOnly=applyRatingsTask(copy("B"),fetched,{hltb:null,metacritic:null},"hltb");
  const stats=ratingsOverview([found,hltbOnly,copy("C",{platform:"Playstation 2"})]);
  expect(stats.pendingHltbCopies).toBe(1);
  expect(stats.pendingMetacriticCopies).toBe(2);
  expect(stats.pendingHltbGroups).toBe(1);
  expect(stats.pendingMetacriticGroups).toBe(2);
 });
 it("does not replace a previous score with a null from a different provider",()=>{
  const game=copy("A",{referenceRatings:{...fetched,hltb:{mainHours:null,gameId:null,status:"error"}}});
  const recovered=applyRatingsTask(game,{...emptyRatings("2026-10-18"),hltb:{mainHours:18,gameId:"77",status:"matched"}},{hltb:null,metacritic:null},"hltb");
  expect(recovered.referenceRatings?.metacritic.score).toBe(91);
 });
});

describe("HLTB transient failure recovery",()=>{
  it("skips only the failed title for this run, without changing the collection",()=>{
    const games=[copy("A"),copy("A2"),copy("B",{title:"Different Game"})];
    const initial=nextRatingsTask(games,"hltb");
    expect(initial?.ids).toEqual(["A","A2"]);
    const resumed=nextRatingsTask(games,"hltb",initial?.ids);
    expect(resumed?.ids).toEqual(["B"]);
    expect(nextRatingsTask(games,"hltb",["A","A2","B"])).toBeNull();
    expect(nextRatingsTask(games,"hltb")?.ids).toEqual(["A","A2"]);
    expect(games[0].referenceRatings).toBeNull();
  });
  it("classifies only transient HLTB outages as recoverable",()=>{
    expect(isTransientHltbFailure({source:"hltb",reason:"timeout"},"hltb")).toBe(true);
    expect(isTransientHltbFailure({source:"hltb",reason:"network"},"hltb")).toBe(true);
    expect(isTransientHltbFailure({source:"hltb",reason:"http",httpStatus:429},"hltb")).toBe(true);
    expect(isTransientHltbFailure({source:"hltb",reason:"http",httpStatus:503},"hltb")).toBe(true);
    expect(isTransientHltbFailure({source:"hltb",reason:"http",httpStatus:404},"hltb")).toBe(false);
    expect(isTransientHltbFailure({source:"hltb",reason:"provider"},"hltb")).toBe(false);
    expect(isTransientHltbFailure({source:"rawg",reason:"timeout"},"hltb")).toBe(false);
    expect(isTransientHltbFailure({source:"hltb",reason:"timeout"},"metacritic")).toBe(false);
  });
  it("retries at most once with a delay then surfaces persistent outages",async()=>{
    let attempts=0,waits=0;
    const result=await retryTransientHltb("hltb",async()=>{
      attempts++;
      if(attempts===1)throw {source:"hltb",reason:"timeout"};
      return 23;
    },async()=>{waits++});
    expect(result).toBe(23);
    expect(attempts).toBe(2);
    expect(waits).toBe(1);
    let failed=0;
    await expect(retryTransientHltb("hltb",async()=>{
      failed++;throw {source:"hltb",reason:"timeout"};
    },async()=>{waits++})).rejects.toMatchObject({reason:"timeout"});
    expect(failed).toBe(2);
    let rawgCalls=0;
    await expect(retryTransientHltb("metacritic",async()=>{
      rawgCalls++;throw {source:"rawg",reason:"timeout"};
    },async()=>{waits++})).rejects.toMatchObject({source:"rawg"});
    expect(rawgCalls).toBe(1);
  });
});

describe("stop policy after repeated outages",()=>{
  it("continues after isolated errors and stops on the third consecutive failure",()=>{
    expect(shouldPauseAfterOutages(1)).toBe(false);
    expect(shouldPauseAfterOutages(2)).toBe(false);
    expect(shouldPauseAfterOutages(3)).toBe(true);
    expect(shouldPauseAfterOutages(4)).toBe(true);
  });
});
