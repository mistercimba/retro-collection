import "server-only";
import { createDecipheriv, createHash } from "node:crypto";
import collectionSnapshot from "@/data/collection-snapshot.json";
import type { CollectionDataProvider } from "./provider";
import type { RawSheetData } from "./types";

type EncryptedCollectionSnapshot = {
  schemaVersion: number;
  capturedAt: string;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

let decodedSnapshot: RawSheetData | null = null;

function normalizedPrivateKey() {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "";
}

function snapshotKey() {
  const source = normalizedPrivateKey();
  if (!source) throw new Error("GOOGLE_PRIVATE_KEY em falta para abrir o snapshot local da coleção.");
  return createHash("sha256").update(source, "utf8").digest();
}

function decryptSnapshot(): RawSheetData {
  if (decodedSnapshot) return decodedSnapshot;

  const envelope = collectionSnapshot as EncryptedCollectionSnapshot;
  if (
    envelope.schemaVersion !== 1 ||
    envelope.algorithm !== "aes-256-gcm" ||
    !envelope.iv ||
    !envelope.tag ||
    !envelope.ciphertext
  ) {
    throw new Error("Snapshot local da coleção indisponível ou inválido.");
  }

  const decipher = createDecipheriv("aes-256-gcm", snapshotKey(), Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const data = JSON.parse(plaintext) as RawSheetData;

  if (!Array.isArray(data.collection) || !Array.isArray(data.audit)) {
    throw new Error("Snapshot local da coleção não contém COLLECTION/AUDIT LOG válidos.");
  }

  decodedSnapshot = data;
  return data;
}

export class SnapshotProvider implements CollectionDataProvider {
  constructor(private readonly fallback?: CollectionDataProvider) {}

  async read(): Promise<RawSheetData> {
    try {
      return decryptSnapshot();
    } catch (error) {
      console.error("collection_snapshot_read_failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        hasFallback: Boolean(this.fallback),
      });
      if (!this.fallback) throw error;
      return this.fallback.read();
    }
  }
}
