import { describe, expect, it } from "vitest";
import type { CollectionGame, LibraryData } from "./data/types";
import { emptyRatings } from "./game-ratings.logic";
import { pendingRatingFields } from "./ratings-maintenance.logic";
import {
  blockConflictingNewHltb, findHltbIdCollision, findKnownCastlevaniaCollision,
  prepareCastlevaniaHltbRepair,
} from "./hltb-id-integrity.logic";

const game=(id:string,title:string,externalId:string|null,hours:number|null=10) =>
  ({ collectionId:id, title, platform:"Game Boy Color", edition:"Standard",
    keepStatus:"Collection",
    referenceRatings:{...emptyRatings("2026-10-18"),
      hltb:{gameId:externalId,mainHours:hours,status:hours?"matched":"unmatched",lookupVersion:2}},
  } as CollectionGame);
const zelda=game("GBC-1","The Legend of Zelda: Oracle of Seasons","10039",15);
const castlevania=game("GB-2","Castlevania II: Belmont's Revenge","10039",15);
const library={schemaVersion:1,updatedAt:"2026-10-18T00:00:00Z",
  collection:[zelda,castlevania],wishlist:[],purchases:[],valuations:[],componentNeeds:[],
  collectionLists:[],history:[],
} as LibraryData;

describe("HLTB external ID integrity",()=>{
  it("detects a collision across different titles, not duplicates or same-name platforms",()=>{
    expect(findHltbIdCollision([zelda],"Castlevania II: Belmont's Revenge","10039"))
      .toEqual({collectionId:"GBC-1",title:zelda.title,gameId:"10039"});
    expect(findHltbIdCollision([zelda],"THE LEGEND OF ZELDA Oracle of Seasons","10039")).toBeNull();
    expect(findHltbIdCollision([zelda,castlevania],castlevania.title,"10039",["GBC-1","GB-2"])).toBeNull();
    expect(findHltbIdCollision([zelda],"Other",null)).toBeNull();
    expect(findHltbIdCollision([game("3","Game",null,null)],"Other","10039")).toBeNull();
  });
  it("blocks saving false HLTB hours without touching Metacritic or original",()=>{
    const incoming={...emptyRatings("2026-10-18"),hltb:{gameId:"10039",mainHours:12,status:"matched" as const},
      metacritic:{score:85,url:null,rawgUrl:null,status:"matched" as const}};
    const candidate=blockConflictingNewHltb([zelda],castlevania.title,incoming);
    expect(candidate.hltb).toMatchObject({gameId:null,mainHours:null,status:"ambiguous",lookupVersion:2});
    expect(candidate.metacritic.score).toBe(85);
    // Conflict quarantine remains visible for manual review, not scheduled for
    // an automatic retry that could reuse the same incorrect HLTB ID.
    expect(pendingRatingFields({referenceRatings:candidate} as CollectionGame).hltb).toBe(false);
    const legacy={...incoming,lookupVersion:1,hltb:{...incoming.hltb,lookupVersion:1}};
    const safeLegacy=blockConflictingNewHltb([zelda],castlevania.title,legacy);
    expect(safeLegacy.hltb.lookupVersion).toBe(2);
    expect(pendingRatingFields({referenceRatings:safeLegacy} as CollectionGame).hltb).toBe(false);
    expect(incoming.hltb.gameId).toBe("10039");
    expect(blockConflictingNewHltb([zelda],zelda.title,incoming)).toBe(incoming);
  });
  it("removes only Castlevania's contaminated reference while preserving Zelda and all other fields",()=>{
    const snapshot=JSON.stringify(library);
    const matches=findKnownCastlevaniaCollision(library.collection);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({collectionId:"GB-2",wrongId:"10039",savedHours:15});
    expect(prepareCastlevaniaHltbRepair(library,"invalid")).toBeNull();
    const fixed=prepareCastlevaniaHltbRepair(library,"GB-2")!;
    expect(fixed.collection[0]).toBe(zelda);
    expect(fixed.collection[1].referenceRatings?.hltb)
      .toMatchObject({mainHours:null,gameId:null,status:"error",lookupVersion:2});
    // The explicit, owner-confirmed repair intentionally reopens the HLTB queue.
    expect(pendingRatingFields(fixed.collection[1]).hltb).toBe(true);
    expect(fixed.collection[1].referenceRatings?.metacritic)
      .toEqual(castlevania.referenceRatings?.metacritic);
    expect(fixed.collection[1].title).toBe(castlevania.title);
    expect(findKnownCastlevaniaCollision(fixed.collection)).toHaveLength(0);
    expect(prepareCastlevaniaHltbRepair(fixed,"GB-2")).toBeNull();
    expect(JSON.stringify(library)).toBe(snapshot);
  });
  it("does not offer repair without independent Zelda reference or after the wrong ID changed",()=>{
    expect(findKnownCastlevaniaCollision([castlevania])).toHaveLength(0);
    expect(findKnownCastlevaniaCollision([zelda,game("GB-2",castlevania.title,"1571",4)])).toHaveLength(0);
    expect(findKnownCastlevaniaCollision([zelda,game("GB-2","Castlevania III","10039",8)])).toHaveLength(0);
  });
});
