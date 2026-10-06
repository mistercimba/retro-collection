import "server-only";
import { get, put } from "@vercel/blob";
import type { CanonicalGameArtwork, CanonicalGameIdentity } from "@/lib/data/types";
import { igdbCoverUrl } from "@/lib/igdb-catalog.logic";

const PREFIX = "retro-collection/catalog-artwork/igdb";

function pathnameFor(identity: CanonicalGameIdentity) {
  const image = identity.coverImageId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `${PREFIX}/${identity.sourceGameId}-${image}.jpg`;
}

export async function ensureCanonicalArtwork(identity: CanonicalGameIdentity): Promise<CanonicalGameArtwork | null> {
  if (!identity.coverImageId) return null;
  const pathname = pathnameFor(identity);

  try {
    const existing = await get(pathname, { access: "private", useCache: true });
    if (existing) return { source: "IGDB", pathname, contentType: "image/jpeg" };
  } catch {
    // A failed existence check should not prevent a fresh import attempt.
  }

  const response = await fetch(igdbCoverUrl(identity.coverImageId), { cache: "no-store" });
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: false,
    contentType,
    allowOverwrite: true,
  });
  return { source: "IGDB", pathname, contentType };
}

export async function getCanonicalArtwork(pathname: string) {
  if (!pathname.startsWith(`${PREFIX}/`)) return null;
  return get(pathname, { access: "private", useCache: true });
}
