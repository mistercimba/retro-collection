import { isAuthenticated } from "@/lib/auth";
import { getLibrary } from "@/lib/library-store";
import { getWishlistArtworkOverride } from "@/lib/wishlist-artwork-override";
import { resolveWishlistArtworkOverrideCandidate } from "@/lib/wishlist-artwork-candidates.logic";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ targetId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  if (!(await isAuthenticated())) return new Response("Não autenticado.", { status: 401 });

  const { targetId } = await params;
  const url = new URL(request.url);
  const title = url.searchParams.get("title") ?? "";
  const platform = url.searchParams.get("platform") ?? "";
  const library = await getLibrary();
  const target = library.wishlist.find((item) =>
    item.targetId === decodeURIComponent(targetId) &&
    item.title === title &&
    item.platform === platform
  );
  if (!target?.artworkOverride?.pathname) return new Response("Artwork manual não disponível.", { status: 404 });
  if (!resolveWishlistArtworkOverrideCandidate(target)) return new Response("Artwork manual incompatível.", { status: 404 });

  const blob = await getWishlistArtworkOverride(target.artworkOverride.pathname);
  if (!blob) return new Response("Artwork manual não encontrado.", { status: 404 });

  return new Response(blob.stream, {
    headers: {
      "Content-Type": target.artworkOverride.contentType || "image/jpeg",
      "Cache-Control": "private, max-age=86400",
      "Content-Disposition": "inline",
    },
  });
}
