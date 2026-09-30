import "server-only";
import { cache } from "react";
import { get, put } from "@vercel/blob";
import type { LibraryData } from "@/lib/data/types";

const LIBRARY_PATH = "retro-collection/library.json";

function validLibrary(value: unknown): value is Omit<LibraryData, "history"> & { history?: LibraryData["history"] } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LibraryData>;
  return candidate.schemaVersion === 1 &&
    typeof candidate.updatedAt === "string" &&
    Array.isArray(candidate.collection) &&
    Array.isArray(candidate.wishlist) &&
    Array.isArray(candidate.purchases) &&
    Array.isArray(candidate.valuations) &&
    (candidate.history === undefined || Array.isArray(candidate.history));
}

async function readBlobLibrary(): Promise<LibraryData | null> {
  const result = await get(LIBRARY_PATH, { access: "private", useCache: false });
  if (!result) return null;
  const payload = JSON.parse(await new Response(result.stream).text()) as unknown;
  if (!validLibrary(payload)) throw new Error("A library.json no Blob é inválida.");
  return { ...payload, history: payload.history ?? [] };
}

async function readRequiredLibrary(): Promise<LibraryData> {
  const library = await readBlobLibrary();
  if (!library) throw new Error("A library.json não existe no Blob privado.");
  return library;
}

export const getLibrary = cache(readRequiredLibrary);

export async function saveLibrary(data: LibraryData): Promise<LibraryData> {
  const next: LibraryData = { ...data, schemaVersion: 1, updatedAt: new Date().toISOString(), history: data.history ?? [] };
  await put(LIBRARY_PATH, JSON.stringify(next), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return next;
}

export async function updateLibrary(mutator: (current: LibraryData) => LibraryData): Promise<LibraryData> {
  const current = await readRequiredLibrary();
  return saveLibrary(mutator(structuredClone(current)));
}

export async function getLibraryStorageMode(): Promise<"blob" | "missing"> {
  return (await readBlobLibrary()) ? "blob" : "missing";
}
