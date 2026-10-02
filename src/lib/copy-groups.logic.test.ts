import { describe, expect, it } from "vitest";
import { collectionCopyIdentity, selectPhysicalCopies } from "./copy-groups.logic";

type Copy = {
  collectionId: string;
  title: string;
  platform: string;
  keepStatus: string;
  acquiredDate: string;
};

const copy = (overrides: Partial<Copy> = {}): Copy => ({
  collectionId: "PS2-0001",
  title: "Pokémon Box",
  platform: "GameCube",
  keepStatus: "Collection",
  acquiredDate: "2024-01-01",
  ...overrides,
});

describe("physical copy groups", () => {
  it("groups exact normalized title + platform identities without fuzzy matching", () => {
    expect(collectionCopyIdentity(copy())).toBe(collectionCopyIdentity(copy({ title: "Pokemon   Box" })));
    expect(collectionCopyIdentity(copy())).not.toBe(collectionCopyIdentity(copy({ title: "Pokémon Box 2" })));
    expect(collectionCopyIdentity(copy())).not.toBe(collectionCopyIdentity(copy({ platform: "Wii" })));
  });

  it("keeps collection and for-sale physical copies while excluding sold history", () => {
    const current = copy();
    const result = selectPhysicalCopies([
      current,
      copy({ collectionId: "PS2-0002", keepStatus: "Sell", acquiredDate: "2024-03-01" }),
      copy({ collectionId: "PS2-0003", keepStatus: "Sold", acquiredDate: "2024-02-01" }),
      copy({ collectionId: "PS2-0004", title: "Pokémon Box 2" }),
    ], current);

    expect(result.map((item) => item.collectionId)).toEqual(["PS2-0001", "PS2-0002"]);
  });

  it("still includes the current sold record when its own detail is opened", () => {
    const sold = copy({ collectionId: "PS2-0003", keepStatus: "Sold", acquiredDate: "2023-01-01" });
    const result = selectPhysicalCopies([
      copy({ collectionId: "PS2-0002", acquiredDate: "2024-01-01" }),
      sold,
      copy({ collectionId: "PS2-0004", keepStatus: "Sold", acquiredDate: "2022-01-01" }),
    ], sold);

    expect(result.map((item) => item.collectionId)).toEqual(["PS2-0003", "PS2-0002"]);
  });
});
