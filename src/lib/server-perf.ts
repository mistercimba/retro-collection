import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

export type ServerPerfSpan = { name: string; durationMs: number; cache?: "hit" | "miss" | "in-flight" | "unknown" };
type PerfScope = { spans: ServerPerfSpan[] };

const scope = new AsyncLocalStorage<PerfScope>();

export async function measureServerWork<T>(name: string, work: () => Promise<T>, cache?: ServerPerfSpan["cache"]): Promise<T> {
  const active = scope.getStore();
  if (!active) return work();
  const started = performance.now();
  try {
    return await work();
  } finally {
    active.spans.push({ name, durationMs: Math.round((performance.now() - started) * 10) / 10, ...(cache ? { cache } : {}) });
  }
}

export async function measureServerFetch<T extends Response | null>(name: string, work: () => Promise<T>): Promise<T> {
  const started = performance.now();
  let response: T | undefined;
  try {
    response = await work();
    return response;
  } finally {
    const hint = response?.headers.get("x-vercel-cache") ?? response?.headers.get("x-nextjs-cache") ?? response?.headers.get("x-cache");
    const normalized = hint?.toLowerCase();
    const cache: ServerPerfSpan["cache"] = normalized === "hit" || normalized === "stale" ? "hit" : normalized === "miss" || normalized === "revalidated" ? "miss" : "unknown";
    recordServerPerf(name, performance.now() - started, cache);
  }
}

export function recordServerPerf(name: string, durationMs: number, cache?: ServerPerfSpan["cache"]): void {
  scope.getStore()?.spans.push({ name, durationMs: Math.round(durationMs * 10) / 10, ...(cache ? { cache } : {}) });
}

export async function collectServerPerf<T>(work: () => Promise<T>): Promise<{ value: T; spans: ServerPerfSpan[]; totalMs: number }> {
  const active: PerfScope = { spans: [] };
  const started = performance.now();
  const value = await scope.run(active, work);
  return { value, spans: active.spans, totalMs: Math.round((performance.now() - started) * 10) / 10 };
}

export function toServerTimingHeader(spans: ServerPerfSpan[], totalMs: number): string {
  const entries = spans.map(({ name, durationMs, cache }) => `${name.replace(/[^a-zA-Z0-9_-]/g, "_")};dur=${durationMs}${cache ? `;desc="${cache}"` : ""}`);
  entries.push(`loader_total;dur=${Math.round(totalMs * 10) / 10}`);
  return entries.join(", ");
}
