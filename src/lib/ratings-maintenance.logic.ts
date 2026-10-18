import type { CollectionGame, OneTimeGameRatings } from "./data/types";
import { ratingEditionKey } from "./game-ratings-enrichment.logic";
import { emptyRatings, positiveMainHours, ratingScore } from "./game-ratings.logic";

export type RatingsOverview = {ownedCopies:number;hltbKnown:number;metacriticKnown:number;pendingCopies:number;pendingGroups:number;attemptedWithoutBoth:number};
function attempted(r:OneTimeGameRatings|null|undefined,field:"hltb"|"metacritic") {
  if (!r?.fetchedAt) return false;
  return ["matched","unmatched","ambiguous","unavailable"].includes(r[field]?.status ?? "");
}
export function pendingRatingFields(copy:CollectionGame) {
  const r=copy.referenceRatings;
  return {hltb:positiveMainHours(r?.hltb?.mainHours)===null&&!attempted(r,"hltb"),
    metacritic:ratingScore(r?.metacritic?.score)===null&&!attempted(r,"metacritic")};
}
function ownedGroups(all:CollectionGame[]) {
  const groups=new Map<string,CollectionGame[]>();
  for(const game of all) {
    if(game.keepStatus!=="Collection") continue;
    const k=ratingEditionKey(game);
    const group=groups.get(k)??[];group.push(game);groups.set(k,group);
  }
  return groups;
}
export function ratingsOverview(all:CollectionGame[]):RatingsOverview {
  const owned=all.filter(g=>g.keepStatus==="Collection");
  let hltbKnown=0,metacriticKnown=0,pendingCopies=0,attemptedWithoutBoth=0,pendingGroups=0;
  for(const g of owned) {
    const h=positiveMainHours(g.referenceRatings?.hltb?.mainHours)!==null;
    const m=ratingScore(g.referenceRatings?.metacritic?.score)!==null;
    const pending=pendingRatingFields(g);
    if(h)hltbKnown++;if(m)metacriticKnown++;
    if(pending.hltb||pending.metacritic)pendingCopies++;
    else if(!h||!m)attemptedWithoutBoth++;
  }
  for(const group of ownedGroups(owned).values()) {
    if(group.some(g=>{const p=pendingRatingFields(g);return p.hltb||p.metacritic;}))pendingGroups++;
  }
  return {ownedCopies:owned.length,hltbKnown,metacriticKnown,pendingCopies,pendingGroups,attemptedWithoutBoth};
}
export function nextRatingsTask(all:CollectionGame[]) {
  for(const group of ownedGroups(all).values()) {
    const pending=group.filter(g=>{const p=pendingRatingFields(g);return p.hltb||p.metacritic;});
    if(!pending.length)continue;
    const knownHltb=group.find(g=>positiveMainHours(g.referenceRatings?.hltb?.mainHours)!==null)?.referenceRatings?.hltb??null;
    const knownMetacritic=group.find(g=>ratingScore(g.referenceRatings?.metacritic?.score)!==null)?.referenceRatings?.metacritic??null;
    return {title:pending[0].title,platform:pending[0].platform,ids:pending.map(g=>g.collectionId),
      knownHltb,knownMetacritic,
      lookupHltb:!knownHltb&&pending.some(g=>pendingRatingFields(g).hltb),
      lookupMetacritic:!knownMetacritic&&pending.some(g=>pendingRatingFields(g).metacritic)};
  }
  return null;
}
export function applyRatingsTask(game:CollectionGame, fetched:OneTimeGameRatings,known:{
  hltb:OneTimeGameRatings["hltb"]|null;
  metacritic:OneTimeGameRatings["metacritic"]|null;
}):CollectionGame {
  const pending=pendingRatingFields(game);
  if(!pending.hltb&&!pending.metacritic)return game;
  const previous=game.referenceRatings??emptyRatings(fetched.fetchedAt);
  return {...game,referenceRatings:{
    fetchedAt:fetched.fetchedAt,
    hltb:pending.hltb?(known.hltb??fetched.hltb):previous.hltb,
    metacritic:pending.metacritic?(known.metacritic??fetched.metacritic):previous.metacritic,
  }};
}
