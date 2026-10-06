import "server-only";
import { del, get, put } from "@vercel/blob";
import type { WishlistArtworkOverride } from "@/lib/data/types";
import type { WishlistArtworkCandidate } from "@/data/wishlist-artwork-candidates";

const PREFIX = "retro-collection/wishlist-artwork-overrides";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function safePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 120) || "target";
}

function extension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  return "";
}

export async function storeWishlistArtworkOverride(
  targetId: string,
  candidate: WishlistArtworkCandidate,
): Promise<WishlistArtworkOverride> {
  const source = new URL(candidate.sourceUrl);
  if (source.protocol !== "https:" || source.hostname !== "raw.githubusercontent.com") {
    throw new Error("Fonte de artwork não permitida.");
  }

  const response = await fetch(candidate.sourceUrl, {
    cache: "no-store",
    headers: { "User-Agent": "RetroCollection-ArtworkChoice/1.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("Não foi possível descarregar esta capa.");

  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = extension(contentType);
  if (!ext) throw new Error("Tipo de imagem não suportado.");

  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Imagem inválida ou demasiado grande.");

  const pathname = `${PREFIX}/${safePart(targetId)}/${safePart(candidate.id)}.${ext}`;
  await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });

  return {
    candidateId: candidate.id,
    pathname,
    contentType,
    source: candidate.source,
    sourceRepo: candidate.sourceRepo,
    sourceCommit: candidate.sourceCommit,
    sourcePath: candidate.sourcePath,
    selectedAt: new Date().toISOString(),
  };
}

export async function getWishlistArtworkOverride(pathname: string) {
  if (!pathname.startsWith(PREFIX + "/")) return null;
  return get(pathname, { access: "private", useCache: true });
}

export async function deleteWishlistArtworkOverride(pathname: string): Promise<void> {
  if (!pathname.startsWith(PREFIX + "/")) return;
  await del(pathname);
}
