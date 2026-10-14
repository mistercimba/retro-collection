import { describe, it, expect } from "vitest";
import type { CollectionGame, LibraryData, WantTarget } from "./data/types";
import { verifiedCatalogSuggestions, catalogSuggestionReference } from "./wishlist-catalog-suggestions.logic";

const owned = (title: string, platform = "Nintendo DS") =>
  ({ title, platform, keepStatus: "Collection" }) as CollectionGame;
const wish = (title: string, targetId = "NOVO") =>
  ({ title, platform: "Nintendo DS", targetId }) as WantTarget;
const lib = (collection: CollectionGame[], wishlist: WantTarget[] = []) =>
  ({ collection, wishlist }) as LibraryData;
const game = (id: number, name: string, platforms = [20], collections = [111], total_rating = 90) =>
  ({ id, name, platforms, collections, game_type: 0, total_rating, total_rating_count: 30 });

describe("IGDB verified Wishlist suggestions", () => {
  it("derives a real series sibling from owned canonical anchor, excluding titles already wanted", () => {
    const collection = [owned("Professor Layton 1"), owned("Other")];
    const seed = [{ gameId: 1, title: "Professor Layton 1", platform: "Nintendo DS" }];
    const result = verifiedCatalogSuggestions(
      lib(collection, [wish("Professor Layton 2")]), seed,
      [game(1, "Professor Layton 1")], [{ id: 111, name: "Professor Layton", games: [1, 2, 3] }],
      [game(2, "Professor Layton 2"), game(3, "Professor Layton 3")], [], "",
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Professor Layton 3");
    expect(result[0].reason).toContain("Professor Layton 1");
    expect(result[0].catalog.sourceGameId).toBe(3);
    expect(result[0].reference).toBe(catalogSuggestionReference(3, 20));
  });
  it("rejects unlinked invented sibling suggestions and versions", () => {
    const result = verifiedCatalogSuggestions(
      lib([owned("A"), owned("B")]), [{ gameId: 1, title: "A", platform: "Nintendo DS" }],
      [game(1, "A", [20], [999])], [{ id: 111, name: "Different series" }],
      [game(5, "Unknown", [20], [111]), { ...game(6, "Edition"), game_type: 5 }], [], "",
    );
    expect(result).toHaveLength(0);
  });
  it("backs platform picks with strong IGDB ratings and actual platform ownership", () => {
    const result = verifiedCatalogSuggestions(
      lib([owned("A"), owned("B"), owned("C"), owned("D")]), [], [], [], [],
      [game(15, "Suggested", [20], [], 95), game(16, "Low rating", [20], [], 60)], "",
    );
    expect(result.map((x) => x.title)).toEqual(["Suggested"]);
    expect(result[0].reason).toContain("95/100");
  });
  it("blocks any owned/wanted title even on other platforms, ignores legacy ID collisions", () => {
    const result = verifiedCatalogSuggestions(
      lib([owned("A"), owned("B"), owned("C"), owned("D"), owned("Taken", "GameCube")],
          [wish("Already planned"), wish("Another", "NOVO")]), [], [], [], [],
      [game(10, "Already planned", [20], []), game(11, "Taken", [20], []),
       game(12, "Fresh game", [20], [])], "",
    );
    expect(result.map((x) => x.title)).toEqual(["Fresh game"]);
  });
  it("returns none without verified support, rather than fabricating titles", () => {
    expect(verifiedCatalogSuggestions(lib([owned("A")]), [], [], [], [game(23, "Other")], [], "")).toEqual([]);
  });
});
