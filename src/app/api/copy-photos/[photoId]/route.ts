import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getLibrary, updateLibrary } from "@/lib/library-store";
import { deleteOwnedCopyPhoto, getOwnedCopyPhoto } from "@/lib/owned-copy-photos";
import { ownedCopyPhotoLabel } from "@/lib/owned-copy-photos.logic";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ photoId: string }> };

function collectionIdFrom(request: Request): string {
  return new URL(request.url).searchParams.get("collectionId")?.trim() ?? "";
}

export async function GET(request: Request, { params }: RouteContext) {
  if (!(await isAuthenticated())) return new Response("Não autenticado.", { status: 401 });

  const { photoId } = await params;
  const collectionId = collectionIdFrom(request);
  if (!collectionId || !photoId) return new Response("Pedido inválido.", { status: 400 });

  const library = await getLibrary();
  const game = library.collection.find((item) => item.collectionId === collectionId);
  const photo = game?.photos?.find((item) => item.id === photoId);
  if (!photo) return new Response("Foto não encontrada.", { status: 404 });

  const blob = await getOwnedCopyPhoto(photo.pathname);
  if (!blob) return new Response("Foto não encontrada no armazenamento.", { status: 404 });

  return new Response(blob.stream, {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
    },
  });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { photoId } = await params;
  const collectionId = collectionIdFrom(request);
  if (!collectionId || !photoId) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  let pathname = "";
  let found = false;
  await updateLibrary((library) => {
    const index = library.collection.findIndex((item) => item.collectionId === collectionId);
    if (index < 0) return library;
    const game = library.collection[index];
    const photo = game.photos?.find((item) => item.id === photoId);
    if (!photo) return library;

    found = true;
    pathname = photo.pathname;
    library.collection[index] = { ...game, photos: (game.photos ?? []).filter((item) => item.id !== photoId) };
    library.history ??= [];
    library.history.unshift({
      id: `H-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      action: "collection.photo.remove",
      entityId: game.collectionId,
      title: game.title,
      platform: game.platform,
      summary: `Foto removida · ${ownedCopyPhotoLabel(photo.kind)}`,
      details: [],
    });
    return library;
  });

  if (!found) return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });

  try {
    await deleteOwnedCopyPhoto(pathname);
  } catch (error) {
    console.warn("Could not delete owned-copy photo blob after removing library metadata.", error);
  }

  revalidatePath(`/game/${encodeURIComponent(collectionId)}`);
  revalidatePath("/history");
  return new Response(null, { status: 204 });
}
