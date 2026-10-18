import type { CollectionGame, LibraryData, OneTimeGameRatings } from "./data/types";
import { normalizedGameTitle, positiveMainHours } from "./game-ratings.logic";

const ZELDA = normalizedGameTitle("The Legend of Zelda: Oracle of Seasons");
const CASTLEVANIA = normalizedGameTitle("Castlevania II: Belmont's Revenge");
const WRONG_ID = "10039";

/** External HLTB identifiers may be shared by physical copies of the same game,
 * but must not identify unrelated game titles. */
export function findHltbIdCollision(
  copies: readonly CollectionGame[], title: string, gameId: string | null | undefined,
  excludedCollectionIds: readonly string[] = [],
): { collectionId: string; title: string; gameId: string } | null {
  if (!gameId || !/^\d+$/.test(gameId)) return null;
  const name = normalizedGameTitle(title);
  if (!name) return null;
  const exclude = new Set(excludedCollectionIds);
  const other = copies.find(copy =>
    !exclude.has(copy.collectionId) &&
    copy.referenceRatings?.hltb?.gameId === gameId &&
    positiveMainHours(copy.referenceRatings?.hltb?.mainHours) !== null &&
    normalizedGameTitle(copy.title) !== name,
  );
  return other ? { collectionId: other.collectionId, title: other.title, gameId } : null;
}

export function blockConflictingNewHltb(
  copies: readonly CollectionGame[], title: string, candidate: OneTimeGameRatings,
): OneTimeGameRatings {
  const hltb = candidate.hltb;
  if (!findHltbIdCollision(copies, title, hltb.gameId)) return candidate;
  // An ID collision needs human review, not automatic retries of the same
  // unsafe match. Preserve other providers and mark this attempt as current.
  return {
    ...candidate,
    hltb: { mainHours: null, gameId: null, status: "ambiguous", lookupVersion: 2 },
  };
}

export type KnownHltbCollision = {
  collectionId: string;
  title: string;
  platform: string;
  wrongId: string;
  savedHours: number;
  otherTitle: string;
};

/** Precisely scoped to the independently verified Zelda / Castlevania case.
 * Detection is read-only and revalidates current library contents each time. */
export function findKnownCastlevaniaCollision(copies: readonly CollectionGame[]): KnownHltbCollision[] {
  const verifiedZelda = copies.find(copy =>
    normalizedGameTitle(copy.title) === ZELDA &&
    copy.referenceRatings?.hltb?.gameId === WRONG_ID &&
    positiveMainHours(copy.referenceRatings?.hltb?.mainHours) !== null,
  );
  if (!verifiedZelda) return [];
  return copies.filter(copy =>
    normalizedGameTitle(copy.title) === CASTLEVANIA &&
    copy.referenceRatings?.hltb?.gameId === WRONG_ID &&
    positiveMainHours(copy.referenceRatings?.hltb?.mainHours) !== null,
  ).map(copy => ({
    collectionId: copy.collectionId,
    title: copy.title,
    platform: copy.platform,
    wrongId: WRONG_ID,
    savedHours: copy.referenceRatings!.hltb.mainHours!,
    otherTitle: verifiedZelda.title,
  }));
}

/** Only removes the known incorrect HLTB ID + potentially polluted hours.
 * A future HLTB pass may fetch the correct ID and Main Story time separately. */
export function prepareCastlevaniaHltbRepair(
  library: LibraryData, collectionId: string,
): LibraryData | null {
  if (!findKnownCastlevaniaCollision(library.collection).some(x => x.collectionId === collectionId)) return null;
  return {
    ...library,
    collection: library.collection.map(copy => {
      if (copy.collectionId !== collectionId) return copy;
      const previous = copy.referenceRatings!;
      return {
        ...copy,
        referenceRatings: {
          ...previous,
          hltb: {
            mainHours: null,
            gameId: null,
            status: "error" as const,
            lookupVersion: 2,
          },
        },
      };
    }),
  };
}
