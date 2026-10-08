import "server-only";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { del, get, put } from "@vercel/blob";
import type { WishlistArtworkOverride } from "@/lib/data/types";
import type { WishlistArtworkCandidate } from "@/data/wishlist-artwork-candidates";
import { wishlistArtworkCandidateLocalUrl } from "@/lib/wishlist-artwork-candidates.logic";
import {
  materializedWishlistCandidatePath,
  MAX_WISHLIST_ARTWORK_BYTES,
  wishlistArtworkImageType,
} from "@/lib/wishlist-artwork-override.logic";

const PREFIX = "retro-collection/wishlist-artwork-overrides";

function safePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 120) || "target";
}

async function readMaterializedCandidate(candidate: WishlistArtworkCandidate): Promise<Uint8Array> {
  const localUrl = materializedWishlistCandidatePath(candidate.id, wishlistArtworkCandidateLocalUrl(candidate));
  const localPath = path.join(process.cwd(), "public", localUrl.slice(1));

  try {
    return new Uint8Array(await readFile(localPath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  // Vercel serves public assets separately from serverless function files.
  // Fetch the *deployed app's own* materialized image, never its original provider.
  const host = process.env.VERCEL_URL;
  if (!host || !/^[a-z0-9.-]+$/i.test(host)) {
    throw new Error("A capa materializada não está acessível neste ambiente.");
  }
  // Forward the current browser's cookies for protected preview deployments.
  const cookie = (await headers()).get("cookie");
  const response = await fetch("https://" + host + localUrl, {
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
