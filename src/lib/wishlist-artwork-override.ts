import "server-only";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { del, get, put } from "@vercel/blob";
import type { WishlistArtworkOverride } from "@/lib/data/types";
import type { WishlistArtworkCandidate } from "@/data/wishlist-artwork-candidates";
import { wishlistArtworkCandidateLocalUrl } from "@/lib/wishlist-artwork-candidates.logic";
import {
  materializedWishlistCandidatePath,
  wishlistMaterializedAssetOrigin,
  MAX_WISHLIST_ARTWORK_BYTES,
  wishlistArtworkImageType,
} from "@/lib/wishlist-artwork-override.logic";

const PREFIX = "retro-collection/wishlist-artwork-overrides";

function safePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 120) || "target";
}

async function readMaterializedCandidate(candidate: WishlistArtworkCandidate): Promise<Uint8Array> {
  const localUrl = materializedWishlistCandidatePath(candidate.id, wishlistArtworkCandidateLocalUrl(candidate));
  // Access the public CDN asset rather than reading dynamic filesystem paths.
  // Dynamic fs tracing can package all covers into Vercel serverless functions.
  const requestHeaders = await headers();
  const origin = wishlistMaterializedAssetOrigin(
    process.env.VERCEL_URL,
    requestHeaders.get("host"),
    process.env.NODE_ENV,
  );
  const cookie = requestHeaders.get("cookie");
  const response = await fetch(origin + localUrl, {
    cache: "no-store",
    redirect: "error",
    headers: cookie ? { Cookie: cookie } : {},
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("Não foi possível ler a capa materializada.");
  const advertisedSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(advertisedSize) && advertisedSize > MAX_WISHLIST_ARTWORK_BYTES) {
    throw new Error("Imagem inválida ou demasiado grande.");
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function storeWishlistArtworkOverride(
  targetId: string,
  candidate: WishlistArtworkCandidate,
): Promise<WishlistArtworkOverride> {
  const bytes = Buffer.from(await readMaterializedCandidate(candidate));
  const contentType = wishlistArtworkImageType(bytes);
  const ext = contentType === "image/png" ? "png" : "jpg";

  // Never overwrite an already-selected image before the library save commits.
  const pathname = `${PREFIX}/${safePart(targetId)}/${safePart(candidate.id)}-${randomUUID()}.${ext}`;
  await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: false,
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
    metadataUrl: candidate.metadataUrl,
    metadataSha256: candidate.metadataSha256,
    launchboxDatabaseId: candidate.launchboxDatabaseId,
    sourcePlatform: candidate.sourcePlatform,
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
