export function resolveSavedListScroll(saved: string | null, currentHref: string): number | null {
  if (!saved) return null;
  try {
    const position = JSON.parse(saved) as { href?: unknown; y?: unknown };
    return position.href === currentHref && typeof position.y === "number" && Number.isFinite(position.y) && position.y >= 0 ? position.y : null;
  } catch {
    return null;
  }
}
