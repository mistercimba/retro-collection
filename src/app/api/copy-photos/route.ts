import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getLibrary, updateLibrary } from "@/lib/library-store";
import { MAX_OWNED_COPY_PHOTOS, isOwnedCopyPhotoKind, ownedCopyPhotoLabel, validateOwnedCopyPhotoFile } from "@/lib/owned-copy-photos.logic";
import { deleteOwnedCopyPhoto, storeOwnedCopyPhoto } from "@/lib/owned-copy-photos";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await request.formData();
  const collectionId = String(form.get("collectionId") ?? "").trim();
  const kindValue = String(form.get("kind") ?? "").trim();
  const fileValue = form.get("file");

  if (!collectionId || !isOwnedCopyPhotoKind(kindValue) || !(fileValue instanceof File)) {
    return NextResponse.json({ error: "Pedido de foto inválido." }, { status: 400 });
  }

  const validationError = validateOwnedCopyPhotoFile(fileValue);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const library = await getLibrary();
  const game = library.collection.find((item) => item.collectionId === collectionId);
  if (!game) return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });
  if ((game.photos?.length ?? 0) >= MAX_OWNED_COPY_PHOTOS) {
    return NextResponse.json({ error: `Limite de ${MAX_OWNED_COPY_PHOTOS} fotos por cópia atingido.` }, { status: 409 });
  }

  const photo = await storeOwnedCopyPhoto(collectionId, kindValue, fileValue);
  try {
    await updateLibrary((current) => {
      const index = current.collection.findIndex((item) => item.collectionId === collectionId);
      if (index < 0) throw new Error("Jogo não encontrado durante a gravação.");
      const currentGame = current.collection[index];
      current.collection[index] = { ...currentGame, photos: [...(currentGame.photos ?? []), photo] };
      current.history ??= [];
      current.history.unshift({
        id: `H-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: new Date().toISOString(),
        action: "collection.photo.add",
        entityId: currentGame.collectionId,
        title: currentGame.title,
        platform: currentGame.platform,
        summary: `Foto adicionada · ${ownedCopyPhotoLabel(photo.kind)}`,
        details: [],
      });
      return current;
    });
  } catch (error) {
    try {
      await deleteOwnedCopyPhoto(photo.pathname);
    } catch {
      // Best-effort cleanup if the library write failed after the blob upload.
    }
    throw error;
  }

  revalidatePath(`/game/${encodeURIComponent(collectionId)}`);
  revalidatePath("/history");
  return NextResponse.json({ photo }, { status: 201 });
}
