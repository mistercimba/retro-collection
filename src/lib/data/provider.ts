import type { ProviderMode, RawSheetData } from "./types";
import { GoogleSheetsProvider } from "./google-sheets-provider";
import { LocalSnapshotProvider } from "./local-snapshot-provider";
import { MockProvider } from "./mock-provider";

export interface CollectionDataProvider {
  read(): Promise<RawSheetData>;
}

function hasGoogleCredentials() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
}

export function getProviderMode(): ProviderMode {
  if (process.env.DATA_PROVIDER === "mock") return "mock";
  if (process.env.DATA_PROVIDER === "google") {
    if (!hasGoogleCredentials()) throw new Error("Configuração Google incompleta.");
    return "google";
  }
  if (process.env.NODE_ENV === "production" && !process.env.APP_PASSWORD) {
    throw new Error("APP_PASSWORD é obrigatório em produção para proteger os dados pessoais da coleção.");
  }
  return hasGoogleCredentials() ? "google" : "mock";
}

export function getDataProvider(): CollectionDataProvider {
  if (process.env.DATA_PROVIDER === "mock") return new MockProvider();
  if (process.env.DATA_PROVIDER === "google") return new GoogleSheetsProvider();
  return new LocalSnapshotProvider();
}
