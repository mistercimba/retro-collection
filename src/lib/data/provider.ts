import type { ProviderMode, RawSheetData } from "./types";
import { GoogleSheetsProvider } from "./google-sheets-provider";
import { MockProvider } from "./mock-provider";

export interface CollectionDataProvider {
  read(): Promise<RawSheetData>;
}

export function getProviderMode(): ProviderMode {
  if (process.env.DATA_PROVIDER === "mock") return "mock";
  const hasAnyGoogle = Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_PRIVATE_KEY);
  const hasGoogle = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  );
  if ((process.env.DATA_PROVIDER === "google" || process.env.NODE_ENV === "production" || hasAnyGoogle) && !hasGoogle) {
    throw new Error("Configuração Google incompleta: define GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY.");
  }
  if (process.env.NODE_ENV === "production" && !process.env.APP_PASSWORD) throw new Error("APP_PASSWORD é obrigatório em produção para proteger os dados pessoais da coleção.");
  return hasGoogle ? "google" : "mock";
}

export function getDataProvider(): CollectionDataProvider {
  return getProviderMode() === "google" ? new GoogleSheetsProvider() : new MockProvider();
}
