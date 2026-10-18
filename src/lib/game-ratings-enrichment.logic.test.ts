import { describe, expect, it } from "vitest";
import { missingRatingFields, mergeMissingRatings, ratingEditionKey, validatePrivateLibrary } from "./game-ratings-enrichment.logic";
import { emptyRatings } from "./game-ratings.logic";

describe("one-time ratings maintenance safety", () => {
 const previous = { ...emptyRatings("2026-10-01"), hltb: { mainHours: 15, gameId: "42", status: "matched" as const } };
 const fetched = { ...emptyRatings("2026-10-17"), hltb: { mainHours: 33, gameId: "88", status: "matched" as const },
  metacritic: { score: 91, url: "https://metacritic.com/game/test", rawgUrl: "https://rawg.io/games/test", status: "matched" as const } };
 it("requests only genuinely missing fields", () => {
   expect(missingRatingFields({referenceRatings: previous})).toEqual({ hltb:false, metacritic:true });
   expect(missingRatingFields({referenceRatings: null})).toEqual({ hltb:true, metacritic:true });
 });
 it("never overwrites a preexisting confirmed rating", () => {
   const patched = mergeMissingRatings(previous, fetched);
   expect(patched.hltb).toEqual(previous.hltb);
   expect(patched.metacritic.score).toBe(91);
   expect(mergeMissingRatings(null, fetched)).toEqual(fetched);
 });
 it("does not share ratings across different editions or platforms", () => {
   const game = {title:"Resident Evil 4",platform:"Nintendo Wii",edition:"Standard"};
   expect(ratingEditionKey(game)).toBe(ratingEditionKey({...game,title:"RESIDENT EVIL 4"}));
   expect(ratingEditionKey(game)).not.toBe(ratingEditionKey({...game,edition:"Collector's Edition"}));
   expect(ratingEditionKey(game)).not.toBe(ratingEditionKey({...game,platform:"Playstation 2"}));
 });
 it("rejects missing or duplicate copy identifiers and incomplete blob schemas", () => {
   const valid = {schemaVersion:1,updatedAt:"2026-10-17",collection:[{collectionId:"WII-0019",title:"RE4",platform:"Nintendo Wii",edition:"Standard",keepStatus:"Collection"}],
    wishlist:[],purchases:[],valuations:[]};
   expect(validatePrivateLibrary(valid)).toBe(true);
   expect(validatePrivateLibrary({...valid,collection:[...valid.collection,...valid.collection]})).toBe(false);
   expect(validatePrivateLibrary({...valid,collection:[{...valid.collection[0],title:""}]})).toBe(false);
 });
});
