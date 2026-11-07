import { describe, expect, it } from "vitest";
import type { LibraryData } from "@/lib/data/types";
import { buildCollectionWishlistExport } from "./collection-wishlist-export.logic";

describe("collection/wishlist audit export allowlist", () => {
  it("keeps all current states and legitimate duplicate target IDs, but strips private purchase and photo data", () => {
    const library = {
      schemaVersion: 1,
      updatedAt: "2026-11-07T21:19:39.964Z",
      collection: [
        {
          collectionId: "PAL-1", title: "Zelda II", platform: "NES",
          edition: "Standard", region: "PAL", keepStatus: "Collection",
          media: "Yes", box: "Yes", manual: "No",
          purchaseId: "SECRET-PURCHASE", allocatedCostEur: 75, notes: "seller's private phone",
          photos: [{ pathname: "private/copy-photo.jpg" }],
          audit: { localizedTitle: "Zelda II", productCode: "NES-AL-EEC", region: "PAL", releaseMarket: "Portugal", ean: "SECRET-BARCODE" },
        },
        {
          collectionId: "PAL-2", title: "Metroid", platform: "NES",
          edition: "Standard", region: "PAL", keepStatus: "Sold",
          media: "Yes", box: "No", manual: "No", audit: null,
        },
      ],
      wishlist: [
        {
          targetId: "NOVO", title: "Metroid", platform: "NES", priority: "Alta",
          targetVersion: "PAL CIB", status: "WATCH", reason: "Classic",
          notes: "Confirmar PAL original", priceCeilingEur: 55,
          acquisition: { state: "ordered", purchaseId: "SECRET-ORDER", orderedAt: "2026-11-07" },
        },
        {
          targetId: "NOVO", title: "Kid Icarus", platform: "NES", priority: "Média",
          targetVersion: "PAL", status: "WATCH", reason: "",
          notes: "", priceCeilingEur: null,
        },
      ],
      purchases: [{ purchaseId: "SECRET-PURCHASE", seller: "person" }],
      valuations: [{ valueEur: 300 }],
      componentNeeds: [{ notes: "private" }],
      collectionLists: [{ name: "private" }],
      history: [{ summary: "private" }],
    } as unknown as LibraryData;

    const result = buildCollectionWishlistExport(library, "2026-11-07T22:00:00.000Z");
    expect(result).toMatchObject({
      exportedAt: "2026-11-07T22:00:00.000Z",
      sourceUpdatedAt: "2026-11-07T21:19:39.964Z",
      collection: [
        { title: "Zelda II", region: "PAL", keepStatus: "Collection", audit: { productCode: "NES-AL-EEC" } },
        { title: "Metroid", keepStatus: "Sold", audit: null },
      ],
      wishlist: [
        { targetId: "NOVO", title: "Metroid", acquisitionState: "ordered" },
        { targetId: "NOVO", title: "Kid Icarus", acquisitionState: null },
      ],
    });
    expect(result.collection).toHaveLength(2);
    expect(result.wishlist).toHaveLength(2);

    const serialized = JSON.stringify(result);
    for (const forbidden of ["SECRET-PURCHASE", "SECRET-ORDER", "SECRET-BARCODE", "seller's private phone", "private/copy-photo.jpg", "valueEur", "priceCeilingEur", "componentNeeds", "collectionLists", "history", "purchases", "valuations", "photos"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
