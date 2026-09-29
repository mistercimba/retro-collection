import "server-only";
import { get, put } from "@vercel/blob";
import { SnapshotProvider } from "@/lib/data/snapshot-provider";
import { joinCollectionWithAudit, parseAuditRow, parseCollectionRow } from "@/lib/data/parsers";
import type { LibraryData } from "@/lib/data/types";

const LIBRARY_PATH = "retro-collection/library.json";
let memory: LibraryData | null = null;

function validLibrary(value: unknown): value is LibraryData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LibraryData>;
  return candidate.schemaVersion === 1 &&
    typeof candidate.updatedAt === "string" &&
    Array.isArray(candidate.collection) &&
    Array.isArray(candidate.wishlist) &&
    Array.isArray(candidate.purchases) &&
    Array.isArray(candidate.valuations);
}

async function readBlobLibrary(): Promise<LibraryData | null> {
  try {
    const result = await get(LIBRARY_PATH, { access: "private", useCache: false });
    if (!result) return null;
    const payload = JSON.parse(await new Response(result.stream).text()) as unknown;
    return validLibrary(payload) ? payload : null;
  } catch {
    return null;
  }
}

async function migrateLegacySnapshot(): Promise<LibraryData> {
  const raw = await new SnapshotProvider().read();
  const collection = raw.collection
    .map(parseCollectionRow)
    .filter((item) => item.collectionId && item.title)
    .map((item) => ({ ...item, platform: raw.platformOverrides?.[item.collectionId] ?? item.platform }));
  const audit = raw.audit.map(parseAuditRow).filter((entry) => entry.collectionId);
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    collection: joinCollectionWithAudit(collection, audit),
    wishlist: raw.wantlist ?? [],
    purchases: raw.purchases ?? [],
    valuations: raw.valuations ?? [],
  };
}

export async function getLibrary(): Promise<LibraryData> {
  const stored = await readBlobLibrary();
  if (stored) return stored;
  const migrated = await migrateLegacySnapshot();
  try {
    return await saveLibrary(migrated);
  } catch (error) {
    console.error("library_seed_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return migrated;
  }
}

export async function saveLibrary(data: LibraryData): Promise<LibraryData> {
  const next: LibraryData = { ...data, schemaVersion: 1, updatedAt: new Date().toISOString() };
  await put(LIBRARY_PATH, JSON.stringify(next), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  memory = next;
  return next;
}

export async function updateLibrary(mutator: (current: LibraryData) => LibraryData): Promise<LibraryData> {
  const current = await getLibrary();
  return saveLibrary(mutator(structuredClone(current)));
}

export async function getLibraryStorageMode(): Promise<"blob" | "snapshot-fallback"> {
  return (await readBlobLibrary()) ? "blob" : "snapshot-fallback";
}
