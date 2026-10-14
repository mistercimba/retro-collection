import type { CanonicalGameIdentity, CollectionList, LibraryData, WantTarget } from "./data/types";
import type { VerifiedIgdbSuggestion } from "./wishlist-catalog-suggestions.logic";
import { normalizeMatchText } from "./data/wishlist-matching";
import { platformSlug } from "./data/platforms";

type ExistingLibrary = Pick<LibraryData, "collection" | "wishlist" | "collectionLists">;

export type SuggestionSource = {
  listId: string;
  targetId: string;
  listName: string;
  ownedCount: number;
  totalCount: number;
  reason: string;
  score: number;
  reference: string;
};

export type WishlistGapSuggestion = {
  title: string;
  platform: string;
  key: string;
  reason: string;
  score: number;
  reference: string;
  sources: SuggestionSource[];
  origin?: "catalog-series" | "catalog-platform";
  catalog?: CanonicalGameIdentity;
  anchorTitle?: string;
};

export function wishlistSuggestionIdentity(value: { title: string; platform: string }): string {
  return platformSlug(value.platform) + "|" + normalizeMatchText(value.title);
}

// An opaque pointer to a user-maintained list target, never a client-supplied
// arbitrary game title. The mutation re-resolves it from the fresh library.
export function listTargetReference(listId: string, targetId: string): string {
  return JSON.stringify([listId, targetId]);
}

function progressReason(list: CollectionList, ownedCount: number) {
  const missing = list.targets.length - ownedCount;
  if (ownedCount > 0 && missing === 1) {
    return 'Completa a lista “' + list.name + '” (' + ownedCount + '/' + list.targets.length + ')';
  }
  if (ownedCount > 0) {
    return 'Avança a lista “' + list.name + '” (' + ownedCount + '/' + list.targets.length + ')';
  }
  return 'Está na tua lista “' + list.name + '” (ainda sem jogos na Collection)';
}

function progressScore(list: CollectionList, owned: number): number {
  if (owned > 0 && list.targets.length - owned === 1) return 500 + list.targets.length;
  if (owned > 0) return 200 + Math.round(100 * owned / list.targets.length);
  return 100;
}

/**
 * Only recommend gaps explicitly recorded in the user's own Collection lists.
 * Do not infer unknown sequels from title similarity, fabricate catalog games
 * or fill an arbitrary fixed recommendation quota.
 */
export function suggestWishlistListGaps(library: ExistingLibrary): WishlistGapSuggestion[] {
  const unavailable = new Set<string>();
  // Conservatively exclude all recorded copies, including Sell/Sold: a past
  // purchase is not a new wishlist opportunity merely because it was sold.
  for (const game of library.collection) unavailable.add(wishlistSuggestionIdentity(game));
  // Also exclude inactive, ambiguous, and ordered Wishlist records. Old
  // targetId "NOVO" is not an identity; title + platform is.
  for (const target of library.wishlist) unavailable.add(wishlistSuggestionIdentity(target));

  const found = new Map<string, WishlistGapSuggestion>();
  for (const list of [...(library.collectionLists ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-PT") || a.id.localeCompare(b.id)
  )) {
    if (!list.targets.length) continue;
    const ownedKeys = new Set(library.collection
      .filter((game) => game.keepStatus === "Collection")
      .map(wishlistSuggestionIdentity));
    const ownedCount = list.targets.filter((target) =>
      ownedKeys.has(wishlistSuggestionIdentity(target))
    ).length;
    const score = progressScore(list, ownedCount);
    const reason = progressReason(list, ownedCount);

    for (const target of list.targets) {
      const key = wishlistSuggestionIdentity(target);
      if (!normalizeMatchText(target.title) || !platformSlug(target.platform) ||
          unavailable.has(key)) continue;

      const source: SuggestionSource = {
        listId: list.id, targetId: target.id, listName: list.name,
        ownedCount, totalCount: list.targets.length,
        reason, score, reference: listTargetReference(list.id, target.id),
      };
      const prior = found.get(key);
      if (!prior) {
        found.set(key, {
          title: target.title.trim(), platform: target.platform.trim(), key,
          reason, score, reference: source.reference, sources: [source],
        });
      } else {
        if (prior.sources.some((entry) => entry.reference === source.reference)) continue;
        prior.sources.push(source);
        if (score > prior.score ||
            (score === prior.score && list.name.localeCompare(prior.sources.find(
              (entry) => entry.reference === prior.reference
            )?.listName ?? "", "pt-PT") < 0)) {
          prior.reason = reason;
          prior.score = score;
          prior.reference = source.reference;
        }
      }
    }
  }

  return [...found.values()].sort((a, b) =>
    b.score - a.score ||
    a.platform.localeCompare(b.platform, "pt-PT") ||
    a.title.localeCompare(b.title, "pt-PT")
  );
}

export function combineWishlistSuggestions(
  library: ExistingLibrary,
  catalogCandidates: readonly VerifiedIgdbSuggestion[],
): WishlistGapSuggestion[] {
  const declared = suggestWishlistListGaps(library);
  const existing = new Set(declared.map((item) => item.key));
  const unavailable = new Set([
    ...library.collection.map(wishlistSuggestionIdentity),
    ...library.wishlist.map(wishlistSuggestionIdentity),
  ]);
  const catalog = catalogCandidates.filter((candidate) => {
    if (existing.has(candidate.key) || unavailable.has(candidate.key)) return false;
    existing.add(candidate.key);
    return true;
  }).map((candidate): WishlistGapSuggestion => ({
    title: candidate.title, platform: candidate.platform,
    key: candidate.key, reference: candidate.reference,
    reason: candidate.reason, score: candidate.score,
    sources: [], origin: candidate.origin === "series" ? "catalog-series" : "catalog-platform",
    catalog: candidate.catalog, ...(candidate.anchorTitle ? {anchorTitle:candidate.anchorTitle}:{})
  }));
  return [...declared, ...catalog].sort((a, b) =>
    b.score - a.score ||
    a.platform.localeCompare(b.platform, "pt-PT") ||
    a.title.localeCompare(b.title, "pt-PT")
  ).slice(0, 40);
}

/**
 * Pure acceptance function so tests can prove the confirmation guard. The
 * server action re-runs this inside a fresh Blob read-modify-write transaction.
 */
export function acceptWishlistListGaps(
  library: LibraryData,
  requestedReferences: readonly string[],
  options: { now: string; nextId: () => string; nextHistoryId: () => string },
  verifiedCatalog: readonly VerifiedIgdbSuggestion[] = [],
): { library: LibraryData; added: WantTarget[] } {
  const copy: LibraryData = structuredClone(library);
  const candidates = combineWishlistSuggestions(copy, verifiedCatalog);
  const available = new Map<string, WishlistGapSuggestion>();
  for (const suggestion of candidates) {
    available.set(suggestion.reference, suggestion);
    for (const source of suggestion.sources) available.set(source.reference, suggestion);
  }
  const inCollection = new Set(copy.collection.map(wishlistSuggestionIdentity));
  const inWishlist = new Set(copy.wishlist.map(wishlistSuggestionIdentity));
  const allTitles = new Set([
    ...copy.collection.map((game) => normalizeMatchText(game.title)),
    ...copy.wishlist.map((game) => normalizeMatchText(game.title)),
  ]);
  const seenKeys = new Set<string>();
  const added: WantTarget[] = [];

  // Never accept more than 40 independent targets in a single action.
  for (const reference of [...new Set(requestedReferences)].slice(0, 40)) {
    const suggestion = available.get(reference);
    if (!suggestion || seenKeys.has(suggestion.key) ||
        inCollection.has(suggestion.key) || inWishlist.has(suggestion.key)) continue;
    if (suggestion.origin) {
      // A previously verified IGDB recommendation must still have its source
      // evidence: series anchor, or significant owned-console presence.
      if (allTitles.has(normalizeMatchText(suggestion.title))) continue;
      const kept = copy.collection.filter((game) =>
        game.keepStatus === "Collection" && platformSlug(game.platform) === platformSlug(suggestion.platform));
      if (suggestion.origin === "catalog-series" &&
          !kept.some((game) => game.title === suggestion.anchorTitle)) continue;
      if (suggestion.origin === "catalog-platform" && kept.length < 4) continue;
    }
    seenKeys.add(suggestion.key);
    const target: WantTarget = {
      targetId: options.nextId(),
      title: suggestion.title,
      platform: suggestion.platform,
      priority: "Média",
      reason: suggestion.reason,
      targetVersion: "",
      priceCeilingEur: null,
      status: "ACTIVE",
      notes: "",
      ...(suggestion.catalog ? { catalog: { ...suggestion.catalog, selectedAt: options.now } } : {}),
    };
    copy.wishlist.push(target);
    inWishlist.add(suggestion.key);
    copy.history ??= [];
    copy.history.unshift({
      id: options.nextHistoryId(), at: options.now,
      action: "wishlist.add", entityId: target.targetId,
      title: target.title, platform: target.platform,
      summary: "Adicionado à Wishlist a partir de uma sugestão confirmada",
      details: [target.reason],
    });
    added.push(target);
  }
  return { library: copy, added };
}
