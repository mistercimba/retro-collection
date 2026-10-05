import "server-only";
import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { get, put } from "@vercel/blob";
import type { LibraryData } from "@/lib/data/types";

const LIBRARY_PATH = "retro-collection/library.json";
export const LIBRARY_CACHE_TAG = "retro-library";

function validLibrary(value: unknown): value is Omit<LibraryData, "history" | "collectionLists"> & {
  history?: LibraryData["history"];
  collectionLists?: LibraryData["collectionLists"];
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LibraryData>;
  return candidate.schemaVersion === 1 &&
    typeof candidate.updatedAt === "string" &&
    Array.isArray(candidate.collection) &&
    Array.isArray(candidate.wishlist) &&
    Array.isArray(candidate.purchases) &&
    Array.isArray(candidate.valuations) &&
    (candidate.collectionLists === undefined || Array.isArray(candidate.collectionLists)) &&
    (candidate.history === undefined || Array.isArray(candidate.history));
}

async function readBlobLibrary(): Promise<LibraryData | null> {
  const result = await get(LIBRARY_PATH, { access: "private", useCache: false });
  if (!result) return null;
  const payload = JSON.parse(await new Response(result.stream).text()) as unknown;
  if (!validLibrary(payload)) throw new Error("A library.json no Blob é inválida.");
  return { ...payload, collectionLists: payload.collectionLists ?? [], history: payload.history ?? [] };
}

async function readRequiredLibrary(): Promise<LibraryData> {
  const library = await readBlobLibrary();
  if (!library) throw new Error("A library.json não existe no Blob privado.");
  return library;
}

const readCachedLibrary = unstable_cache(
  readRequiredLibrary,
  ["retro-library-v1"],
  { tags: [LIBRARY_CACHE_TAG], revalidate: false },
);

export const getLibrary = cache(readCachedLibrary);

export async function saveLibrary(data: LibraryData): Promise<LibraryData> {
  const next: LibraryData = {
    ...data,
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    collectionLists: data.collectionLists ?? [],
    history: data.history ?? [],
  };
  await put(LIBRARY_PATH, JSON.stringify(next), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  revalidateTag(LIBRARY_CACHE_TAG, { expire: 0 });
  return next;
}

export async function updateLibrary(mutator: (current: LibraryData) => LibraryData): Promise<LibraryData> {
  // Mutations always read the Blob directly so read-modify-write starts from the
  // latest persisted state. The successful save invalidates the shared read cache.
  const current = await readRequiredLibrary();
  return saveLibrary(mutator(structuredClone(current)));
}

export async function getLibraryStorageMode(): Promise<"blob" | "missing"> {
  return (await readBlobLibrary()) ? "blob" : "missing";
}
