export type AppNavigationHref = "/" | "/collection" | "/want" | "/history";

export function getActiveAppNavigation(pathname: string, tab: string | null): AppNavigationHref | null {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/history")) return "/history";
  if (pathname.startsWith("/want") || pathname.startsWith("/wish/")) return "/want";
  if (pathname.startsWith("/platform/")) return tab === "wishlist" ? "/want" : "/collection";
  if (pathname.startsWith("/collection") || pathname.startsWith("/game/")) return "/collection";
  return null;
}
