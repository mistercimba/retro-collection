import { describe, expect, it } from "vitest";
import type { CollectionGame, CollectionList, LibraryData, WantTarget } from "./data/types";
import type { VerifiedIgdbSuggestion } from "./wishlist-catalog-suggestions.logic";
import {
  acceptWishlistListGaps, combineWishlistSuggestions, listTargetReference, suggestWishlistListGaps, wishlistSuggestionIdentity,
} from "./wishlist-list-suggestions.logic";

const game = (title: string, platform = "Nintendo DS", keepStatus = "Collection") =>
  ({ title, platform, keepStatus }) as CollectionGame;
const wish = (title: string, platform = "Nintendo DS", status = "ACTIVE", targetId = "NOVO") =>
  ({ title, platform, status, targetId }) as WantTarget;
const list = (id: string, name: string, titles: string[], platform = "Nintendo DS"): CollectionList =>
  ({ id, name, description: "", createdAt: "", targets: titles.map((title, i) =>
    ({ id: "T-" + i, title, platform })) });
const library = (collection: CollectionGame[] = [], wishlist: WantTarget[] = [],
  collectionLists: CollectionList[] = []): LibraryData => ({
    schemaVersion: 1, updatedAt: "2026-10-13T21:00:00Z",
    collection, wishlist, collectionLists, purchases: [], valuations: [],
    componentNeeds: [], history: [],
  });

function euListProof(current: LibraryData, title: string): VerifiedIgdbSuggestion {
  const item = suggestWishlistListGaps(current).find((suggestion) => suggestion.title === title);
  if (!item) throw Error("Test fixture must have a missing list target");
  return {
    key: wishlistSuggestionIdentity(item), reference: item.reference,
    title: item.title, platform: item.platform, score: item.score, reason: item.reason,
    origin: "list", euReleaseVerified: true,
    catalog: {
      source: "IGDB", sourceGameId: 100, sourcePlatformId: 20,
      title: item.title, platform: item.platform, edition: "Standard",
      summary: "", firstReleaseDate: "", genres: [], developers: [],
      publishers: [], coverImageId: "", selectedAt: "",
    },
  };
}

describe("contextual Wishlist suggestions", () => {
  it("hides even explicitly listed goals unless an exact European release is verified", () => {
    const current = library([], [], [list("L", "Wish", ["One"])]);
    expect(combineWishlistSuggestions(current, [])).toEqual([]);
    const proof = euListProof(current, "One");
    expect(combineWishlistSuggestions(current, [proof])).toMatchObject([
      { title: "One", origin: "catalog-list", euReleaseVerified: true },
    ]);
    expect(acceptWishlistListGaps(current, [listTargetReference("L", "T-0")], {
      now: "", nextId: () => "X", nextHistoryId: () => "Y",
    }).added).toHaveLength(0);
  });

  it("returns zero instead of fabricating series entries when there are no list gaps", () => {
    expect(suggestWishlistListGaps(library([game("Super Mario World")]))).toEqual([]);
  });

  it("suggests only user-declared missing goals with progress-based reasons", () => {
    const source = library([game("Professor Layton 1")], [], [
      list("L", "Professor Layton", ["Professor Layton 1", "Professor Layton 2"]),
    ]);
    const unchanged = structuredClone(source);
    expect(suggestWishlistListGaps(source)).toMatchObject([
      { title: "Professor Layton 2", platform: "Nintendo DS",
        reason: "Completa a lista “Professor Layton” (1/2)" },
    ]);
    expect(source).toEqual(unchanged);
  });

  it("excludes collection, Sell and Sold records and every wishlist state despite colliding NOVO IDs", () => {
    const source = library(
      [game("A"), game("B", "Nintendo DS", "Sell"), game("C", "Nintendo DS", "Sold")],
      [wish("D", "Nintendo DS", "ACTIVE"), wish("E", "Nintendo DS", "INATIVO"),
       { ...wish("F"), acquisition: { state: "ordered", purchaseId: "P-1", orderedAt: "" } }],
      [list("L", "Gaps", ["A", "B", "C", "D", "E", "F", "G"])],
    );
    expect(suggestWishlistListGaps(source).map((x) => x.title)).toEqual(["G"]);
  });

  it("keeps a same-title game on a different platform, and blocks accent/punctuation variants", () => {
    const source = library([game("Pokémon: Blue", "Game Boy")],
      [wish("Professor Layton - 2")],
      [list("L", "Variants", ["Pokemon Blue", "Professor Layton 2", "Pokémon Blue"], "Nintendo DS")]);
    expect(suggestWishlistListGaps(source).map((x) => x.title)).toEqual(["Pokemon Blue"]);
  });

  it("deduplicates targets appearing in several lists and prioritizes closest owned completion", () => {
    const source = library([game("A"), game("B")], [], [
      list("L1", "Mais longe", ["A", "B", "C", "D"]),
      list("L2", "Quase completa", ["A", "B", "C"]),
    ]);
    const found = suggestWishlistListGaps(source);
    expect(found.map((x) => x.title)).toEqual(["C", "D"]);
    expect(found[0].sources).toHaveLength(2);
    expect(found[0].reason).toContain("Completa a lista “Quase completa”");
  });

  it("never adds without explicit references and rejects forged or stale list references", () => {
    const current = library([], [], [list("L", "Wishlist", ["One", "Two"])]);
    const initial = structuredClone(current);
    let n = 0;
    const options = { now: "2026-10-14T10:00:00Z",
      nextId: () => "APP-" + ++n, nextHistoryId: () => "H-" + n };
    const noop = acceptWishlistListGaps(current, [], options);
    expect(noop.added).toHaveLength(0);
    expect(current).toEqual(initial);
    const result = acceptWishlistListGaps(current, [
      JSON.stringify(["L", "NOT-A-TARGET"]),
      listTargetReference("L", "T-0"),
      listTargetReference("L", "T-0"),
    ], options, [euListProof(current, "One")]);
    expect(result.added).toHaveLength(1);
    expect(result.added[0]).toMatchObject({
      title: "One", targetId: "APP-1", priority: "Média",
      targetVersion: "", priceCeilingEur: null, status: "ACTIVE",
    });
    expect(result.library.history).toMatchObject([{
      action: "wishlist.add", title: "One", summary: "Adicionado à Wishlist a partir de uma sugestão confirmada",
    }]);
    expect(current).toEqual(initial);
    const stale = structuredClone(current);
    stale.collectionLists[0].targets = [];
    expect(acceptWishlistListGaps(stale, [listTargetReference("L", "T-0")], options).added).toHaveLength(0);
  });

  it("accepts only reviewed, verified IGDB proposals and records catalog provenance", () => {
    const original = library(
      [game("Existing"), game("Owned 2"), game("Owned 3"), game("Owned 4")],
    );
    const rated = {
      key: "ds|recommended", reference: JSON.stringify(["igdb", 512, 20]),
      title: "Recommended", platform: "Nintendo DS", score: 230,
      reason: "Bem avaliado no IGDB", origin: "platform" as const, euReleaseVerified: true as const,
      catalog: {
        source: "IGDB" as const, sourceGameId: 512, sourcePlatformId: 20,
        title: "Recommended", platform: "Nintendo DS",
        edition: "Standard", summary: "", firstReleaseDate: "",
        genres: [], developers: [], publishers: [],
        coverImageId: "", selectedAt: "",
      },
    };
    let generated = 0;
    const opts = {
      now: "2026-10-14T12:00:00.000Z",
      nextId: () => "APP-" + ++generated, nextHistoryId: () => "H-" + generated,
    };
    const added = acceptWishlistListGaps(original, [rated.reference], opts, [rated]);
    expect(added.added).toHaveLength(1);
    expect(added.added[0].catalog).toMatchObject({
      sourceGameId: 512, sourcePlatformId: 20, selectedAt: opts.now,
    });
    expect(added.library.history[0].action).toBe("wishlist.add");
    expect(original.wishlist).toHaveLength(0);

    const nowOwned = library([...original.collection, game("Recommended")]);
    expect(acceptWishlistListGaps(nowOwned, [rated.reference], opts, [rated]).added).toHaveLength(0);
    const nowWanted = library(original.collection, [wish("Recommended")]);
    expect(acceptWishlistListGaps(nowWanted, [rated.reference], opts, [rated]).added).toHaveLength(0);
    const noPlatformEvidence = library([game("Existing")]);
    expect(acceptWishlistListGaps(noPlatformEvidence, [rated.reference], opts, [rated]).added).toHaveLength(0);
    const forged = acceptWishlistListGaps(original, [JSON.stringify(["igdb", 1, 20])], opts, [rated]);
    expect(forged.added).toHaveLength(0);
  });

  it("rechecks owned and ordered states immediately before an approved addition", () => {
    const target = listTargetReference("L", "T-0");
    const changed = library([game("One")], [wish("Two", "Nintendo DS", "ACTIVE")],
      [list("L", "Series", ["One", "Two"])]);
    const added = acceptWishlistListGaps(changed, [target, listTargetReference("L", "T-1")], {
      now: "", nextId: () => "APP-new", nextHistoryId: () => "H-new",
    });
    expect(added.added).toHaveLength(0);
  });
});
