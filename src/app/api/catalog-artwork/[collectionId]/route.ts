import { isAuthenticated } from "@/lib/auth";
import { getLibrary } from "@/lib/library-store";
import { getCanonicalArtwork } from "@/lib/catalog-artwork";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ collectionId: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  if (!(await isAuthenticated())) return new Response("Não autenticado.", { status: 401 });
  const { collectionId } = await params;
  const library = await getLibrary();
  const game = library.collection.find((item) => item.collectionId === decodeURIComponent(collectionId));
  const artwork = game?.catalog?.artwork;
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
