import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import type { WishlistArtworkOverride } from "@/lib/data/types";
import type { WishlistArtworkCandidate } from "@/data/wishlist-artwork-candidates";
import { wishlistArtworkCandidateLocalUrl } from "@/lib/wishlist-artwork-candidates.logic";

const PREFIX = "retro-collection/wishlist-artwork-overrides";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const LOCAL_CANDIDATE_ROOT = path.resolve(process.cwd(), "public", "covers", "wishlist-candidates");

function safePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 120) || "target";
}

function localCandidate(candidate: WishlistArtworkCandidate) {
  const localUrl = wishlistArtworkCandidateLocalUrl(candidate);
  if (!localUrl) throw new Error("Capa local inválida.");

  const filename = path.resolve(process.cwd(), "public", localUrl.replace(/^\/+/, ""));
  if (filename !== LOCAL_CANDIDATE_ROOT && !filename.startsWith(LOCAL_CANDIDATE_ROOT + path.sep)) {
    throw new Error("Caminho de artwork não permitido.");
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : ext === ".jpg" ? "image/jpeg" : "";
  if (!contentType) throw new Error("Tipo de imagem não suportado.");
  return { filename, contentType, ext: ext.slice(1) };
}

function validImageBytes(bytes: Buffer, contentType: string) {
  if (contentType === "image/png") {
    return bytes.length > 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === "image/jpeg") {
    return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return false;
}

export async function storeWishlistArtworkOverride(
  targetId: string,
  candidate: WishlistArtworkCandidate,
): Promise<WishlistArtworkOverride> {
  const local = localCandidate(candidate);

  let bytes: Buffer;
  try {
    bytes = await fs.readFile(local.filename);
  } catch {
    throw new Error("A cópia local desta capa não está disponível.");
  }

  if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES || !validImageBytes(bytes, local.contentType)) {
    throw new Error("Imagem local inválida ou demasiado grande.");
  }

  const pathname = `${PREFIX}/${safePart(targetId)}/${safePart(candidate.id)}.${local.ext}`;
  await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: local.contentType,
  });

  return {
    candidateId: candidate.id,
    pathname,
    contentType: local.contentType,
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
