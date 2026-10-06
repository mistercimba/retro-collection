import { isAuthenticated } from "@/lib/auth";
import { getLibrary } from "@/lib/library-store";
import { getCanonicalArtwork } from "@/lib/catalog-artwork";

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
  const artwork = target?.catalog?.artwork;
  if (!artwork?.pathname) return new Response("Artwork não disponível.", { status: 404 });

  const blob = await getCanonicalArtwork(artwork.pathname);
  if (!blob) return new Response("Artwork não encontrado.", { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "Content-Type": artwork.contentType || "image/jpeg",
      "Cache-Control": "private, max-age=86400",
      "Content-Disposition": "inline",
    },
  });
}
