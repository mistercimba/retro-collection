import { describe, expect, it } from "vitest";
import { wrappingDialogFocusIndex } from "./dialog-focus.logic";

describe("keyboard focus containment for dialogs", () => {
  it("wraps forward from the last action to the first", () => {
    expect(wrappingDialogFocusIndex(4, 3, false)).toBe(0);
  });
  it("wraps backward from the first action to the last", () => {
    expect(wrappingDialogFocusIndex(4, 0, true)).toBe(3);
  });
  it("keeps native tabbing between internal fields", () => {
    expect(wrappingDialogFocusIndex(4, 1, false)).toBeNull();
    expect(wrappingDialogFocusIndex(4, 2, true)).toBeNull();
  });
  it("recovers when focus moved outside the dialog", () => {
    expect(wrappingDialogFocusIndex(3, -1, false)).toBe(0);
    expect(wrappingDialogFocusIndex(3, -1, true)).toBe(2);
  });
  it("focuses the dialog itself if no enabled controls exist", () => {
    expect(wrappingDialogFocusIndex(0, -1, false)).toBe(-1);
  });
  it("keeps one-control modals trapped on their only action", () => {
    expect(wrappingDialogFocusIndex(1, 0, true)).toBe(0);
    expect(wrappingDialogFocusIndex(1, 0, false)).toBe(0);
  });
});
