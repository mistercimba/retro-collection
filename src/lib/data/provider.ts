import type { ProviderMode, RawSheetData } from "./types";
import { GoogleSheetsProvider } from "./google-sheets-provider";
import { MockProvider } from "./mock-provider";
import { SnapshotProvider } from "./snapshot-provider";

export interface CollectionDataProvider {
  read(): Promise<RawSheetData>;
}

function googleConfigState() {
  const hasAnyGoogle = Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_PRIVATE_KEY);
  const hasGoogle = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  );
  return { hasAnyGoogle, hasGoogle };
}

export function getProviderMode(): ProviderMode {
  if (process.env.DATA_PROVIDER === "mock") return "mock";
  const { hasAnyGoogle, hasGoogle } = googleConfigState();
  if ((process.env.DATA_PROVIDER === "google" || process.env.DATA_PROVIDER === "snapshot" || process.env.NODE_ENV === "production" || hasAnyGoogle) && !hasGoogle) {
    throw new Error("Configuração Google incompleta: define GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY.");
  }
  if (process.env.NODE_ENV === "production" && !process.env.APP_PASSWORD) throw new Error("APP_PASSWORD é obrigatório em produção para proteger os dados pessoais da coleção.");
  if (process.env.DATA_PROVIDER === "snapshot" || process.env.NODE_ENV === "production") return "snapshot";
  return hasGoogle ? "google" : "mock";
}

export function getDataProvider(): CollectionDataProvider {
  const mode = getProviderMode();
  if (mode === "mock") return new MockProvider();
  if (mode === "google") return new GoogleSheetsProvider();
  return new SnapshotProvider(new GoogleSheetsProvider());
}
