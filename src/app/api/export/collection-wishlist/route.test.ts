import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { LibraryData } from "@/lib/data/types";

const mocks = vi.hoisted(() => ({
  authEnabled: vi.fn(),
  isAuthenticated: vi.fn(),
  getFreshLibrary: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  authEnabled: mocks.authEnabled,
  isAuthenticated: mocks.isAuthenticated,
}));
vi.mock("@/lib/library-store", () => ({ getFreshLibrary: mocks.getFreshLibrary }));
import { GET } from "./route";

beforeEach(() => {
  mocks.authEnabled.mockReturnValue(true);
  mocks.isAuthenticated.mockResolvedValue(true);
  mocks.getFreshLibrary.mockResolvedValue({
    schemaVersion: 1, updatedAt: "2026-11-07",
    collection: [{ collectionId: "owned", title: "Owned", platform: "GameCube", edition: "PAL", region: "PAL", keepStatus: "Collection", media: "Yes", box: "Yes", manual: "Yes", audit: null, purchaseId: "hidden-purchase" }],
    wishlist: [{ targetId: "wanted", title: "Wanted", platform: "NES", priority: "Alta", targetVersion: "PAL", status: "WATCH", notes: "Version note", reason: "" }],
    purchases: [{ seller: "hidden-seller" }], valuations: [], componentNeeds: [], collectionLists: [], history: [],
  } as unknown as LibraryData);
});
afterEach(() => {
  vi.restoreAllMocks();
  mocks.authEnabled.mockReset();
  mocks.isAuthenticated.mockReset();
  mocks.getFreshLibrary.mockReset();
});

describe("GET /api/export/collection-wishlist", () => {
  it("fails closed when APP_PASSWORD is not configured", async () => {
    mocks.authEnabled.mockReturnValue(false);
    const response = await GET();
    expect(response.status).toBe(404);
    expect(mocks.isAuthenticated).not.toHaveBeenCalled();
    expect(mocks.getFreshLibrary).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("rejects unauthenticated requests without touching the private Blob", async () => {
    mocks.isAuthenticated.mockResolvedValue(false);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mocks.getFreshLibrary).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain("Owned");
  });

  it("returns a fresh private attachment with an explicit allowlist", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.getFreshLibrary).toHaveBeenCalledTimes(1);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment; filename="retro-collection-audit-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const body = await response.json();
    expect(body.collection).toHaveLength(1);
    expect(body.wishlist).toHaveLength(1);
    expect(body.collection[0]).toMatchObject({ title: "Owned", keepStatus: "Collection" });
    expect(body.wishlist[0]).toMatchObject({ title: "Wanted", notes: "Version note" });
    expect(JSON.stringify(body)).not.toContain("hidden-seller");
    expect(JSON.stringify(body)).not.toContain("hidden-purchase");
    expect(body).not.toHaveProperty("purchases");
    expect(body).not.toHaveProperty("history");
    expect(body).not.toHaveProperty("valuations");
  });

  it("returns a sanitized 503 when the private read fails", async () => {
    mocks.getFreshLibrary.mockRejectedValue(new Error("TOKEN_SECRET_UNAVAILABLE"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET();
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("TOKEN_SECRET_UNAVAILABLE");
    expect(errorSpy).toHaveBeenCalledWith("collection_wishlist_export_failed", { code: "LIBRARY_UNAVAILABLE" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
