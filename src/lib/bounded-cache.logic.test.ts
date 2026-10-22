import { describe, expect, it, vi } from "vitest";
import { boundedMemoize, singleFlightSnapshot } from "./bounded-cache.logic";

describe("bounded CPU caches", () => {
  it("reuses recently used values and evicts the least recently used at the bound", () => {
    const work = vi.fn((key: string) => key);
    const lookup = boundedMemoize(work, 2);
    lookup("a"); lookup("b"); lookup("a"); lookup("c"); lookup("a");
    expect(work).toHaveBeenCalledTimes(3);
    lookup("b");
    expect(work).toHaveBeenCalledTimes(4);
  });

  it("coalesces reads, expires from completion, and respects source identity", async () => {
    let now = 0;
    const read = vi.fn(async () => ({ version: "one" }));
    const load = singleFlightSnapshot<{ version: string }>(100, () => now);
    const values = await Promise.all([load("main", read), load("main", read)]);
    expect(values[0]).toBe(values[1]);
    expect(read).toHaveBeenCalledTimes(1);
    now = 99;
    await load("main", read);
    expect(read).toHaveBeenCalledTimes(1);
    now = 100;
    await load("main", read);
    await load("other-ref", read);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("retries missing/failed snapshots and a late old source cannot overwrite the new one", async () => {
    const load = singleFlightSnapshot<string>(100);
    const missing = vi.fn(async () => null);
    await load("main", missing); await load("main", missing);
    expect(missing).toHaveBeenCalledTimes(2);
    await expect(load("main", async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    let release!: (value: string) => void;
    const old = load("old", () => new Promise<string>((resolve) => { release = resolve; }));
    await Promise.resolve();
    await load("new", async () => "current");
    release("old"); await old;
    const unnecessaryRead = vi.fn(async () => "wrong");
    expect(await load("new", unnecessaryRead)).toBe("current");
    expect(unnecessaryRead).not.toHaveBeenCalled();
  });
});
