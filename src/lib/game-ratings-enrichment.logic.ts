import type { CollectionGame, OneTimeGameRatings } from "./data/types";
import { normalizedGameTitle, positiveMainHours, ratingScore, emptyRatings } from "./game-ratings.logic";

export type MissingRatingFields = { hltb: boolean; metacritic: boolean };

export function missingRatingFields(game: Pick<CollectionGame, "referenceRatings">): MissingRatingFields {
  return {
    hltb: positiveMainHours(game.referenceRatings?.hltb?.mainHours) === null,
    metacritic: ratingScore(game.referenceRatings?.metacritic?.score) === null,
  };
}

/** Never share a reference across different editions, even on the same console. */
export function ratingEditionKey(game: Pick<CollectionGame, "title" | "platform" | "edition">): string {
  return JSON.stringify([
    normalizedGameTitle(game.title),
    game.platform.trim().toLowerCase(),
    normalizedGameTitle(game.edition || ""),
  ]);
}

export function mergeMissingRatings(
  current: OneTimeGameRatings | null | undefined,
  fetched: OneTimeGameRatings,
): OneTimeGameRatings {
  const prior = current ?? emptyRatings(fetched.fetchedAt);
  const missing = missingRatingFields({ referenceRatings: current });
  return {
    lookupVersion: fetched.lookupVersion,
    fetchedAt: fetched.fetchedAt,
    hltb: missing.hltb ? fetched.hltb : prior.hltb,
    metacritic: missing.metacritic ? fetched.metacritic : prior.metacritic,
  };
}

export function validatePrivateLibrary(value: unknown): value is {schemaVersion: 1;updatedAt: string;collection: CollectionGame[]} {
  if (!value || typeof value !== "object") return false;
  const x = value as Record<string, unknown>;
  if (x.schemaVersion !== 1 || typeof x.updatedAt !== "string" || !Array.isArray(x.collection) ||
      !Array.isArray(x.wishlist) || !Array.isArray(x.purchases) || !Array.isArray(x.valuations)) return false;
  const ids = new Set<string>();
  return (x.collection as unknown[]).every(item => {
    if (!item || typeof item !== "object") return false;
    const c = item as Record<string, unknown>;
    if (typeof c.collectionId !== "string" || !c.collectionId ||
        typeof c.title !== "string" || !c.title || typeof c.platform !== "string" || !c.platform ||
        typeof c.edition !== "string" || typeof c.keepStatus !== "string" || ids.has(c.collectionId)) return false;
    ids.add(c.collectionId);
    return true;
  });
}
