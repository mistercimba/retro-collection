import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollectionGame, LibraryData, WantTarget } from "@/lib/data/types";

const reads = vi.hoisted(() => ({ getLibrary: vi.fn() }));
vi.mock("@/lib/library-store", () => reads);
vi.mock("@/lib/data/collection-service", () => { throw new Error("Health must not import the price/statistics service"); });
vi.mock("@/lib/pricecharting-catalog", () => { throw new Error("Health must not load market prices"); });
import { GET } from "./route";

afterEach(() => { vi.restoreAllMocks(); reads.getLibrary.mockReset(); });

describe("health without market calculation or redundant storage reads", () => {
  it("preserves counts/coverage and reads the library only once", async () => {
    const game = {
      collectionId: "synthetic", catalogId: "synthetic", title: "Synthetic Game", platform: "Playstation 2",
      keepStatus: "Collection", edition: "Standard", region: "PAL", language: "English",
      media: "Yes", box: "Yes", manual: "Yes", conditionGrade: "Good", notes: "",
      needsReview: true, audit: { auditStatus: "Confirmed" },
    } as CollectionGame;
    const target = {
      targetId: "new", platform: game.platform, title: "Synthetic Other", status: "WATCH",
      targetVersion: "PAL Standard; CIB", notes: "",
    } as WantTarget;
    reads.getLibrary.mockResolvedValue({
      schemaVersion: 1, updatedAt: "2026-10-22", collection: [game, { ...game, collectionId: "sell", keepStatus: "Sell" }],
      wishlist: [target, { ...target, status: "PAUSADO" }, { ...target, acquisition: { state: "ordered", purchaseId: "synthetic-order" } }],
      purchases: [], valuations: [], history: [],
    } as unknown as LibraryData);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(reads.getLibrary).toHaveBeenCalledTimes(1);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, provider: "library", storage: "blob",
      collection: { total: 2, kept: 1, sell: 1, sold: 0, review: 1, auditRecords: 2, platforms: 1 },
      wishlist: { total: 3, active: 1, ordered: 1 }, purchases: 0, updatedAt: "2026-10-22" });
    expect(body.artwork).toHaveProperty("collection");
    expect(body.artwork).toHaveProperty("wishlist");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("still returns 503 when the private library cannot be read", async () => {
    reads.getLibrary.mockRejectedValue(new Error("private read failed"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, provider: "library" });
    expect(errors).toHaveBeenCalledWith("Health check failed", { code: "COLLECTION_DATA_UNAVAILABLE" });
  });
});
