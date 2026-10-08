import type { LibraryData } from "./data/types";

export const MAX_WISHLIST_ARTWORK_BYTES = 10 * 1024 * 1024;

export function materializedWishlistCandidatePath(candidateId: string, localUrl: string | null): string {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(candidateId)) throw new Error("Candidato de artwork inválido.");
  const prefix = "/covers/wishlist-candidates/" + candidateId + ".";
  if (localUrl !== prefix + "png" && localUrl !== prefix + "jpg") {
    throw new Error("A capa não está disponível nos assets locais.");
  }
  return localUrl;
}

export function wishlistArtworkImageType(bytes: Uint8Array): "image/png" | "image/jpeg" {
  if (!bytes.byteLength || bytes.byteLength > MAX_WISHLIST_ARTWORK_BYTES) {
    throw new Error("Imagem inválida ou demasiado grande.");
  }
  if (bytes.byteLength >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) {
    return "image/png";
  }
  if (bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  throw new Error("Tipo de imagem não suportado.");
}

export function shouldDeleteUncommittedWishlistArtwork(
  library: Pick<LibraryData, "wishlist"> | null,
  pathname: string,
): boolean {
  // When the fresh read fails, the write outcome is unknown: preserve the asset
  // rather than risk deleting a Blob that the library now references.
  return library !== null && !library.wishlist.some((target) => target.artworkOverride?.pathname === pathname);
}
