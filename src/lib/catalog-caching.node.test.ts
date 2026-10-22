import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const persistent = vi.hoisted(() => new Map<string, string>());
vi.mock("next/cache", () => ({
  // JSON round-trip matches the persistent cache contract, not process identity.
  unstable_cache: (work: (...args: unknown[]) => Promise<unknown>, keys: string[]) => async (...args: unknown[]) => {
    const key = JSON.stringify([keys, args]);
    if (persistent.has(key)) return JSON.parse(persistent.get(key)!);
    const value = await work(...args);
    persistent.set(key, JSON.stringify(value));
    return value;
  },
}));

const entry = { key: "one", platform: "Playstation 2", title: "Persona 4", edition: "Standard" };
const product = {
  platform: "PS2", region: "PAL", title: "Shin Megami Tensei: Persona 4",
  pricechartingUrl: "https://www.pricecharting.com/game/pal-playstation-2/persona-4",
  scrapedAt: "2026-10-01", loose: 10, cib: 20, new: 40,
};
const pc = { source: "pricecharting-pal-local-snapshot", region: "PAL", currency: "USD", generatedAt: "2026-10-01", games: [product] };
const cexGame = { platform: "PS2", productKind: "game", boxId: "p4", boxName: "Persona 4, + Manual, Caixa", sellPrice: 20, cashPrice: 10, variantSignals: { packaging: "boxed" } };
const cex = { version: 1, source: "cex-pt-live-catalog", generatedAt: "2026-10-01", games: [cexGame] };

beforeEach(() => {
  vi.resetModules(); persistent.clear();
  vi.stubEnv("PRICECHARTING_CATALOG_GITHUB_TOKEN", "synthetic-test-only");
  vi.stubEnv("PRICECHARTING_CATALOG_REF", "main");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("catalog CPU reuse and freshness", () => {
  it("downloads/parses once for concurrent requests and skips matching on a persistent hit", async () => {
    const text = vi.fn(async () => JSON.stringify(cex));
    const fetcher = vi.fn(async () => ({ ok: true, text, headers: new Headers() }));
    vi.stubGlobal("fetch", fetcher);
    const { getCexWishlistGuides } = await import("./cex-catalog");
    const { collectServerPerf } = await import("./server-perf");
    const [first, second] = await Promise.all([getCexWishlistGuides([entry]), getCexWishlistGuides([entry])]);
    expect(first.get("one")?.cib.reference?.sellEur).toBe(20);
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(text).toHaveBeenCalledTimes(1);
    const warm = await collectServerPerf(() => getCexWishlistGuides([entry]));
    expect(warm.value).toEqual(first);
    expect(warm.spans.filter((span) => span.name === "cex.local_match")).toHaveLength(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("invalidates on changed source bytes even with the same generatedAt and keeps edition in the cache key", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(cex)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...cex, games: [{ ...cexGame, sellPrice: 25 }] })));
    vi.stubGlobal("fetch", fetcher);
    const { getCexWishlistGuides } = await import("./cex-catalog");
    expect((await getCexWishlistGuides([entry])).get("one")?.cib.reference?.sellEur).toBe(20);
    const otherEdition = await getCexWishlistGuides([{ ...entry, edition: "Platinum" }]);
    expect(otherEdition.get("one")?.cib.status).toBe("unavailable");
    vi.stubEnv("PRICECHARTING_CATALOG_REF", "new-ref");
    expect((await getCexWishlistGuides([entry])).get("one")?.cib.reference?.sellEur).toBe(25);
  });

  it("does not persist an upstream failure", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(cex))));
    const { getCexWishlistGuides } = await import("./cex-catalog");
    expect((await getCexWishlistGuides([entry])).get("one")?.cib.status).toBe("unavailable");
    expect((await getCexWishlistGuides([entry])).get("one")?.cib.status).toBe("matched");
  });

  it("recovers from missing FX, caches successful matches, and refreshes when FX changes", async () => {
    let rate: number | null = null;
    const fetcher = vi.fn(async (url: string) => url.includes("api.github.com")
      ? new Response(JSON.stringify(pc))
      : rate === null ? new Response("offline", { status: 503 }) : new Response(`TIME_PERIOD,OBS_VALUE\n2026-10-22,${rate}`));
    vi.stubGlobal("fetch", fetcher);
    const { getPricechartingGuides } = await import("./pricecharting-catalog");
    const { collectServerPerf } = await import("./server-perf");
    expect((await getPricechartingGuides([entry])).get("one")?.cibEur).toBeNull();
    rate = 2;
    expect((await getPricechartingGuides([entry])).get("one")?.cibEur).toBe(10);
    const warm = await collectServerPerf(() => getPricechartingGuides([entry]));
    expect(warm.value.get("one")?.cibEur).toBe(10);
    expect(warm.spans.filter((span) => span.name === "pricecharting.guide_match")).toHaveLength(0);
    rate = 1;
    expect((await getPricechartingGuides([entry])).get("one")?.cibEur).toBe(20);
    expect(fetcher.mock.calls.filter(([url]) => url.includes("api.github.com"))).toHaveLength(1);
  });

  it("preserves unique-best ambiguity after serialization and in a cold process", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("api.github.com")
      ? new Response(JSON.stringify({ ...pc, games: [product, { ...product, pricechartingUrl: `${product.pricechartingUrl}-other` }] }))
      : new Response("TIME_PERIOD,OBS_VALUE\n2026-10-22,1")));
    const { getPricechartingGuides } = await import("./pricecharting-catalog");
    const first = await getPricechartingGuides([entry]);
    expect(first.get("one")?.source).toBe("Sem correspondência PAL única");
    vi.resetModules(); // warm persistent cache, cold process-local snapshot.
    const cold = await import("./pricecharting-catalog");
    expect(await cold.getPricechartingGuides([entry])).toEqual(first);
  });
});
