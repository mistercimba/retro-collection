import type { ProviderMode, RawSheetData } from "./types";
import { GoogleSheetsProvider } from "./google-sheets-provider";
import { MockProvider } from "./mock-provider";

export interface CollectionDataProvider {
  read(): Promise<RawSheetData>;
}

export function getProviderMode(): ProviderMode {
  if (process.env.DATA_PROVIDER === "mock") return "mock";
  const hasGoogle = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  );
  if (process.env.DATA_PROVIDER === "google" && !hasGoogle) {
    throw new Error("DATA_PROVIDER=google mas faltam credenciais Google Sheets.");
  }
  return hasGoogle ? "google" : "mock";
}

export function getDataProvider(): CollectionDataProvider {
  return getProviderMode() === "google" ? new GoogleSheetsProvider() : new MockProvider();
}
