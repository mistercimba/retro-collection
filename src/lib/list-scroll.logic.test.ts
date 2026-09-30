import { describe, expect, it } from "vitest";
import { resolveSavedListScroll } from "./list-scroll.logic";

describe("list scroll restoration", () => {
  it("restores the saved position only for the exact return URL", () => {
    const record = JSON.stringify({ href: "/platform/ps2?tab=wishlist&q=Silent+Hill", y: 842 });
    expect(resolveSavedListScroll(record, "/platform/ps2?tab=wishlist&q=Silent+Hill")).toBe(842);
    expect(resolveSavedListScroll(record, "/platform/ps2?tab=wishlist")).toBeNull();
  });

  it("ignores malformed or invalid positions", () => {
    expect(resolveSavedListScroll("not-json", "/platform/ps2")).toBeNull();
    expect(resolveSavedListScroll(JSON.stringify({ href: "/platform/ps2", y: -1 }), "/platform/ps2")).toBeNull();
  });
});
