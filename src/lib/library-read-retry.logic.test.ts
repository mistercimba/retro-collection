import { describe, expect, it, vi } from "vitest";
import { retryLibraryRead } from "./library-read-retry.logic";

describe("retryLibraryRead", () => {
  it("retries a transient thrown error and then returns the value", async () => {
    const value = { ok: true };
    const read = vi.fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce(value);
    const sleep = vi.fn(async () => undefined);

    await expect(retryLibraryRead(read, { sleep })).resolves.toBe(value);
    expect(read).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(125);
  });

  it("retries a transient missing result", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("library");
    const sleep = vi.fn(async () => undefined);

    await expect(retryLibraryRead(read, { sleep })).resolves.toBe("library");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("returns null only after all missing attempts are exhausted", async () => {
    const read = vi.fn().mockResolvedValue(null);
    const sleep = vi.fn(async () => undefined);

    await expect(retryLibraryRead(read, { attempts: 3, sleep })).resolves.toBeNull();
    expect(read).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-retryable error", async () => {
    const failure = new Error("invalid library");
    const read = vi.fn().mockRejectedValue(failure);
    const sleep = vi.fn(async () => undefined);

    await expect(retryLibraryRead(read, {
      sleep,
      shouldRetryError: () => false,
    })).rejects.toBe(failure);
    expect(read).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
