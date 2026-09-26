import { GoogleAuth } from "google-auth-library";
import type { CollectionDataProvider } from "./provider";
import type { RawSheetData } from "./types";

function rowsToObjects(values: string[][]): Record<string, string>[] {
  const [headers = [], ...rows] = values;
  return rows
    .filter((row) => row.some((cell) => String(cell ?? "").trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [String(header).trim(), String(row[index] ?? "").trim()])));
}

export class GoogleSheetsProvider implements CollectionDataProvider {
  private async getRange(range: string): Promise<string[][]> {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!spreadsheetId || !email || !privateKey) throw new Error("Credenciais Google Sheets incompletas.");

    const auth = new GoogleAuth({
      credentials: { client_email: email, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) throw new Error("Não foi possível obter token Google.");

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token.token}` },
      next: { revalidate: 60 },
    });
    if (!response.ok) throw new Error(`Google Sheets respondeu ${response.status} ao ler ${range}.`);
    const body = (await response.json()) as { values?: string[][] };
    return body.values ?? [];
  }

  async read(): Promise<RawSheetData> {
    const [collection, audit] = await Promise.all([
      this.getRange("COLLECTION!A1:Z1200"),
      this.getRange("AUDIT LOG!A1:U1200"),
    ]);
    return { collection: rowsToObjects(collection), audit: rowsToObjects(audit) };
  }
}
