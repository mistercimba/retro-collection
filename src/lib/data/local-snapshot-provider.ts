import "server-only";
import snapshot from "@/data/collection-snapshot.json";
import type { CollectionDataProvider } from "./provider";
import type { RawSheetData } from "./types";

const empty: RawSheetData = { collection: [], audit: [], platformOverrides: {}, wantlist: [], purchases: [], valuations: [] };

export class LocalSnapshotProvider implements CollectionDataProvider {
  async read(): Promise<RawSheetData> {
    const data = (snapshot as { data?: RawSheetData }).data;
    return data ? { ...empty, ...data } : empty;
  }
}
