import "server-only";
import { cache } from "react";
import { createHash } from "node:crypto";
import { revalidateTag, unstable_cache } from "next/cache";
import { get, put } from "@vercel/blob";
import type { LibraryData } from "@/lib/data/types";
import { retryLibraryRead } from "@/lib/library-read-retry.logic";

const LIBRARY_PATH = "retro-collection/library.json";
export const LIBRARY_CACHE_TAG = "retro-library";

class InvalidLibraryError extends Error {
  constructor() {
    super("A library.json no Blob é inválida.");
    this.name = "InvalidLibraryError";
  }
}

function validNextObjective(value: unknown) {
  if (value === undefined || value === null) return true;
  if (!value || typeof value !== "object") return false;
  const objective = value as Record<string, unknown>;
  return typeof objective.targetId === "string" &&
    typeof objective.title === "string" &&
    typeof objective.platform === "string" &&
    typeof objective.setAt === "string";
}

function validLibrary(value: unknown): value is Omit<LibraryData, "history" | "collectionLists" | "componentNeeds" | "nextObjective"> & {
  history?: LibraryData["history"];
  collectionLists?: LibraryData["collectionLists"];
  componentNeeds?: LibraryData["componentNeeds"];
  nextObjective?: LibraryData["nextObjective"];
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LibraryData>;
  return candidate.schemaVersion === 1 &&
    typeof candidate.updatedAt === "string" &&
    Array.isArray(candidate.collection) &&
    Array.isArray(candidate.wishlist) &&
    Array.isArray(candidate.purchases) &&
    Array.isArray(candidate.valuations) &&
    (candidate.componentNeeds === undefined || Array.isArray(candidate.componentNeeds)) &&
    validNextObjective(candidate.nextObjective) &&
    (candidate.collectionLists === undefined || Array.isArray(candidate.collectionLists)) &&
    (candidate.history === undefined || Array.isArray(candidate.history));
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

async function readBlobLibraryOnce(): Promise<LibraryData | null> {
  const result = await get(LIBRARY_PATH, { access: "private", useCache: false });
  if (!result) return null;
  const payload = JSON.parse(await new Response(result.stream).text()) as unknown;
  if (!validLibrary(payload)) throw new InvalidLibraryError();
  return {
    ...payload,
    componentNeeds: payload.componentNeeds ?? [],
    nextObjective: payload.nextObjective ?? null,
    collectionLists: payload.collectionLists ?? [],
    history: payload.history ?? [],
  };
}

async function readBlobLibrary(): Promise<LibraryData | null> {
  try {
    return await retryLibraryRead(readBlobLibraryOnce, {
      attempts: 3,
      delayMs: 125,
      shouldRetryError: (error) => !(error instanceof InvalidLibraryError),
      onRetry: ({ attempt, reason, error }) => {
        console.warn("library_blob_read_retry", {
          attempt,
          reason,
          errorName: error ? errorName(error) : undefined,
        });
      },
    });
  } catch (error) {
    console.error("library_blob_read_failed", { errorName: errorName(error) });
    throw error;
  }
}

async function readRequiredLibrary(): Promise<LibraryData> {
  const library = await readBlobLibrary();
  if (!library) {
    console.error("library_blob_missing_after_retries");
    throw new Error("A library.json não existe no Blob privado.");
  }
  return library;
}

const readCachedLibrary = unstable_cache(
  readRequiredLibrary,
  ["retro-library-v1"],
  { tags: [LIBRARY_CACHE_TAG], revalidate: false },
);

export const getLibrary = cache(readCachedLibrary);

// Use only for failure recovery / mutation verification, never cached rendering.
export async function getFreshLibrary(): Promise<LibraryData> {
  return readRequiredLibrary();
}

// Only for an explicitly requested maintenance preflight/apply. Unlike the
// cached app library, this captures the exact persisted bytes so a reviewed
// read-only report can be compared against a future private Blob write.
export async function getFreshLibrarySnapshot(): Promise<{
  library: LibraryData;
  rawJson: string;
  sha256: string;
}> {
  const result = await get(LIBRARY_PATH, { access: "private", useCache: false });
  if (!result) throw new Error("A library.json não existe no Blob privado.");
  const rawJson = await new Response(result.stream).text();
  const payload: unknown = JSON.parse(rawJson);
  if (!validLibrary(payload)) throw new InvalidLibraryError();
  return {
    rawJson,
    sha256: createHash("sha256").update(rawJson).digest("hex"),
    library: {
      ...payload,
      componentNeeds: payload.componentNeeds ?? [],
      nextObjective: payload.nextObjective ?? null,
      collectionLists: payload.collectionLists ?? [],
      history: payload.history ?? [],
    },
  };
}

export async function saveLibrary(data: LibraryData): Promise<LibraryData> {
  const next: LibraryData = {
    ...data,
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    componentNeeds: data.componentNeeds ?? [],
    nextObjective: data.nextObjective ?? null,
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
