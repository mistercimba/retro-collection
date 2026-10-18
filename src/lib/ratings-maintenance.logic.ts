import type { CollectionGame, OneTimeGameRatings } from "./data/types";
import { ratingEditionKey } from "./game-ratings-enrichment.logic";
import { emptyRatings, positiveMainHours, ratingScore } from "./game-ratings.logic";

/** Select exactly one external service during a maintenance pass. */
export type RatingsSource = "hltb" | "metacritic";
export const CURRENT_LOOKUP_VERSION = 2;

export type RatingsOverview = {
  ownedCopies: number;
  hltbKnown: number;
  metacriticKnown: number;
  pendingCopies: number;
  pendingGroups: number;
  attemptedWithoutBoth: number;
  pendingHltbCopies: number;
  pendingMetacriticCopies: number;
  pendingHltbGroups: number;
  pendingMetacriticGroups: number;
};

function attempted(r: OneTimeGameRatings | null | undefined, field: RatingsSource) {
  if (!r?.fetchedAt) return false;
  // The revision is *per provider*: updating HLTB must never mark legacy RAWG
  // attempts as retried (or vice versa). Old payloads fall back to top-level.
  const revision = r[field]?.lookupVersion ?? r.lookupVersion ?? 1;
  if (revision < CURRENT_LOOKUP_VERSION) return false;
  return ["matched", "unmatched", "ambiguous", "unavailable"].includes(r[field]?.status ?? "");
}

export function pendingRatingFields(copy: CollectionGame) {
  const r = copy.referenceRatings;
  return {
    hltb: positiveMainHours(r?.hltb?.mainHours) === null && !attempted(r, "hltb"),
    metacritic: ratingScore(r?.metacritic?.score) === null && !attempted(r, "metacritic"),
  };
}

function ownedGroups(all: CollectionGame[]) {
  const groups = new Map<string, CollectionGame[]>();
  for (const game of all) {
    if (game.keepStatus !== "Collection") continue;
    const key = ratingEditionKey(game);
    const group = groups.get(key) ?? [];
    group.push(game);
    groups.set(key, group);
  }
  return groups;
}

export function ratingsOverview(all: CollectionGame[]): RatingsOverview {
  const owned = all.filter(g => g.keepStatus === "Collection");
  let hltbKnown = 0, metacriticKnown = 0, pendingCopies = 0;
  let pendingHltbCopies = 0, pendingMetacriticCopies = 0;
  let attemptedWithoutBoth = 0;
  for (const g of owned) {
    const h = positiveMainHours(g.referenceRatings?.hltb?.mainHours) !== null;
    const m = ratingScore(g.referenceRatings?.metacritic?.score) !== null;
    const needs = pendingRatingFields(g);
    if (h) hltbKnown++;
    if (m) metacriticKnown++;
    if (needs.hltb) pendingHltbCopies++;
    if (needs.metacritic) pendingMetacriticCopies++;
    if (needs.hltb || needs.metacritic) pendingCopies++;
    else if (!h || !m) attemptedWithoutBoth++;
  }
  let pendingGroups = 0, pendingHltbGroups = 0, pendingMetacriticGroups = 0;
  for (const group of ownedGroups(owned).values()) {
    const h = group.some(g => pendingRatingFields(g).hltb);
    const m = group.some(g => pendingRatingFields(g).metacritic);
    if (h || m) pendingGroups++;
    if (h) pendingHltbGroups++;
    if (m) pendingMetacriticGroups++;
  }
  return {
    ownedCopies: owned.length, hltbKnown, metacriticKnown,
    pendingCopies, pendingGroups, attemptedWithoutBoth,
    pendingHltbCopies, pendingMetacriticCopies,
    pendingHltbGroups, pendingMetacriticGroups,
  };
}

export function nextRatingsTask(all: CollectionGame[], source?: RatingsSource, skippedIds: readonly string[] = []) {
  const skipped = new Set(skippedIds);
  for (const group of ownedGroups(all).values()) {
    const pending = group.filter(g => {
      const needs = pendingRatingFields(g);
      const selected = source ? needs[source] : needs.hltb || needs.metacritic;
      return selected && !skipped.has(g.collectionId);
    });
    if (!pending.length) continue;
    const knownHltb = group.find(g => positiveMainHours(g.referenceRatings?.hltb?.mainHours) !== null)?.referenceRatings?.hltb ?? null;
    const knownMetacritic = group.find(g => ratingScore(g.referenceRatings?.metacritic?.score) !== null)?.referenceRatings?.metacritic ?? null;
    return {
      title: pending[0].title,
      platform: pending[0].platform,
      ids: pending.map(g => g.collectionId),
      knownHltb, knownMetacritic,
      lookupHltb: source !== "metacritic" && !knownHltb && pending.some(g => pendingRatingFields(g).hltb),
      lookupMetacritic: source !== "hltb" && !knownMetacritic && pending.some(g => pendingRatingFields(g).metacritic),
    };
  }
  return null;
}

export function applyRatingsTask(
  game: CollectionGame,
  fetched: OneTimeGameRatings,
  known: { hltb: OneTimeGameRatings["hltb"] | null; metacritic: OneTimeGameRatings["metacritic"] | null },
  source?: RatingsSource,
): CollectionGame {
  const pending = pendingRatingFields(game);
  const updateHltb = pending.hltb && source !== "metacritic";
  const updateMetacritic = pending.metacritic && source !== "hltb";
  if (!updateHltb && !updateMetacritic) return game;
  const previous = game.referenceRatings ?? emptyRatings(fetched.fetchedAt);
  return {
    ...game,
    referenceRatings: {
      // A single-source pass must NOT upgrade the other source's legacy version.
      lookupVersion: source ? game.referenceRatings?.lookupVersion : CURRENT_LOOKUP_VERSION,
      fetchedAt: fetched.fetchedAt,
      hltb: updateHltb
        ? { ...(known.hltb ?? fetched.hltb), lookupVersion: CURRENT_LOOKUP_VERSION }
        : previous.hltb,
      metacritic: updateMetacritic
        ? { ...(known.metacritic ?? fetched.metacritic), lookupVersion: CURRENT_LOOKUP_VERSION }
        : previous.metacritic,
    },
  };
}

/**
 * HLTB may intermittently time out. Only retry timeouts, network errors,
 * HTTP 429 and transient 5xx once. Never retry RAWG automatically here.
 */
export function isTransientHltbFailure(error: unknown, source: RatingsSource): boolean {
  if (source !== "hltb" || !error || typeof error !== "object") return false;
  const e = error as { source?: unknown; reason?: unknown; httpStatus?: unknown };
  if (e.source !== "hltb") return false;
  if (e.reason === "timeout" || e.reason === "network") return true;
  return e.reason === "http" && typeof e.httpStatus === "number" &&
    (e.httpStatus === 429 || e.httpStatus >= 500 && e.httpStatus <= 599);
}

export async function retryTransientHltb<T>(
  source: RatingsSource,
  request: () => Promise<T>,
  wait: () => Promise<void>,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (!isTransientHltbFailure(error, source)) throw error;
    await wait();
    // At most one retry per group. Caller handles a second failure.
    return request();
  }
}

/** Prevent repeatedly hammering an upstream that is failing in succession. */
export function shouldPauseAfterOutages(consecutiveFailures: number): boolean {
  return consecutiveFailures >= 3;
}
