/**
 * Target index only when Tab would escape a keyboard modal or focus has
 * already left it. `null` means browser-native focus movement is safe.
 * `-1` means there is no enabled focusable child: focus the dialog itself.
 */
export function wrappingDialogFocusIndex(
  focusableCount: number,
  activeIndex: number,
  backwards: boolean,
): number | null {
  if (focusableCount <= 0) return -1;
  if (activeIndex < 0) return backwards ? focusableCount - 1 : 0;
  if (backwards && activeIndex === 0) return focusableCount - 1;
  if (!backwards && activeIndex === focusableCount - 1) return 0;
  return null;
}
