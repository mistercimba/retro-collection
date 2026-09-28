import { describe, expect, it } from "vitest";
import { collectServerPerf, measureServerFetch, measureServerWork, recordServerPerf, toServerTimingHeader } from "./server-perf";

describe("server performance diagnostics", () => {
  it("collects safe named stage timings and total loader work", async () => {
    const result = await collectServerPerf(async () => {
      recordServerPerf("google.provider_cache", 0, "miss");
      await measureServerWork("google.auth_token", async () => "token");
      return { count: 3 };
    });

    expect(result.value).toEqual({ count: 3 });
    expect(result.spans.map((span) => span.name)).toEqual(["google.provider_cache", "google.auth_token"]);
    expect(result.spans[0].cache).toBe("miss");
    expect(result.totalMs).toBeGreaterThanOrEqual(0);
  });

  it("emits a Server-Timing value containing durations only", () => {
    expect(toServerTimingHeader([{ name: "google.auth_token", durationMs: 12.3 }], 20)).toBe("google_auth_token;dur=12.3, loader_total;dur=20");
  });

  it("reports external fetch cache as unknown unless a safe cache header exists", async () => {
    const result = await collectServerPerf(() => measureServerFetch("pricecharting.github_fetch", async () => new Response(null, { headers: { "x-vercel-cache": "HIT" } })));
    expect(result.spans[0].cache).toBe("hit");

    const unknown = await collectServerPerf(() => measureServerFetch("ecb.fx_fetch", async () => new Response(null)));
    expect(unknown.spans[0].cache).toBe("unknown");
  });
});
