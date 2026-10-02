import "server-only";
import { del, get, put } from "@vercel/blob";
import type { OwnedCopyPhoto, OwnedCopyPhotoKind } from "@/lib/data/types";
import { ownedCopyPhotoExtension, validateOwnedCopyPhotoFile } from "@/lib/owned-copy-photos.logic";

const PHOTO_PREFIX = "retro-collection/copy-photos";

export async function storeOwnedCopyPhoto(
  collectionId: string,
  kind: OwnedCopyPhotoKind,
  file: File,
): Promise<OwnedCopyPhoto> {
  const validationError = validateOwnedCopyPhotoFile(file);
  if (validationError) throw new Error(validationError);

  const extension = ownedCopyPhotoExtension(file.type);
  if (!extension) throw new Error("Tipo de imagem não suportado.");

  const id = crypto.randomUUID();
  const pathname = `${PHOTO_PREFIX}/${encodeURIComponent(collectionId)}/${id}.${extension}`;

  await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return {
    id,
    kind,
    pathname,
    contentType: file.type,
    originalName: file.name.slice(0, 160),
    uploadedAt: new Date().toISOString(),
  };
}

export async function getOwnedCopyPhoto(pathname: string) {
  return get(pathname, { access: "private", useCache: true });
}

export async function deleteOwnedCopyPhoto(pathname: string): Promise<void> {
  await del(pathname);
}
