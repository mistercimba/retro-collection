import ExcelJS from "exceljs";
import { GoogleAuth } from "google-auth-library";
import type { CollectionDataProvider } from "./provider";
import type { PurchaseRecord, RawSheetData, ValuationSnapshot, WantTarget } from "./types";
import { measureServerFetch, measureServerWork, recordServerPerf } from "../server-perf";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
let workbookCache: { data: RawSheetData; expiresAt: number } | null = null;
let workbookRead: Promise<RawSheetData> | null = null;

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("text" in value) return String(value.text ?? "").trim();
    if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
    if ("hyperlink" in value) {
      const link = value as { text?: string; hyperlink?: string };
      return String(link.text ?? link.hyperlink ?? "").trim();
    }
    return "";
  }
  return String(value).trim();
}

function worksheetRows(sheet: ExcelJS.Worksheet, firstRow = 1): string[][] {
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    if (row.number < firstRow) return;
    const values: string[] = [];
    for (let column = 1; column <= sheet.columnCount; column += 1) {
      values.push(cellText(row.getCell(column).value));
    }
    rows.push(values);
  });
  return rows;
}

function rowsToObjects(values: string[][]): Record<string, string>[] {
  const [headers = [], ...rows] = values;
  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header.trim(), row[index] ?? ""])));
}

function normalizedHeader(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function platformFromPlanTab(name: string): string {
  const source = name.split("—")[0].replace(/\s+PLAN\s*$/i, "").split("-")[0].trim().toUpperCase();
  const labels: Record<string, string> = {
    NES: "NES", SNES: "SNES", N64: "Nintendo 64", GAMECUBE: "GameCube", WII: "Nintendo Wii",
    "WII U": "Nintendo Wii U", SWITCH: "Nintendo Switch", GB: "Game Boy", GBC: "Game Boy Color",
    GBA: "GameBoy Advance", DS: "Nintendo DS", "3DS": "Nintendo 3DS", PS1: "Playstation",
    PS2: "Playstation 2", PS3: "Playstation 3", PS5: "Playstation 5", PSP: "PSP", PC: "PC",
  };
  return labels[source] ?? source;
}

function parsePlanTargetRows(name: string, values: string[][]): WantTarget[] {
  const rows = values.filter((row) => row.some((cell) => cell.trim()));
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizedHeader);
    return headers.includes("id alvo") && headers.includes("jogo em falta");
  });
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map(normalizedHeader);
  const column = (field: string) => headers.indexOf(normalizedHeader(field));
  const get = (row: string[], field: string) => row[column(field)]?.trim() ?? "";
  const targets: WantTarget[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const title = get(row, "Jogo em falta");
    const targetId = get(row, "ID/alvo");
    if (!title || !targetId) continue;
    targets.push({
      platform: platformFromPlanTab(name),
      priority: get(row, "Prioridade"),
      targetId,
      title,
      reason: get(row, "Porque importa"),
      targetVersion: get(row, "Versão / condição alvo"),
      priceCeilingEur: parseAmount(get(row, "Teto validado")),
      status: get(row, "Estado"),
      notes: get(row, "Notas / pesquisa"),
    });
  }
  return targets;
}

export function parsePlanTargets(workbook: ExcelJS.Workbook): WantTarget[] {
  return workbook.worksheets.flatMap((sheet) => {
    if (!normalizedHeader(sheet.name).includes("plan") && !normalizedHeader(cellText(sheet.getCell(1, 1).value)).includes("plan de colecao")) return [];
    return parsePlanTargetRows(sheet.name, worksheetRows(sheet));
  });
}

function parsePurchaseRows(rows: Record<string, string>[]): PurchaseRecord[] {
  return rows.map((row) => ({
    purchaseId: row["Purchase ID"] ?? "",
    date: row.Date ?? "",
    source: row.Source ?? "",
    seller: row.Seller ?? "",
    listingUrl: row["Listing URL"] ?? "",
    itemPriceEur: parseAmount(row["Item Price EUR"]),
    shippingEur: parseAmount(row["Shipping EUR"]),
    feesEur: parseAmount(row["Fees EUR"]),
    totalPaidEur: parseAmount(row["Total Paid EUR"]),
    bundleId: row["Bundle ID"] ?? "",
    notes: row.Notes ?? "",
  })).filter((purchase) => purchase.purchaseId);
}

function parsePurchases(workbook: ExcelJS.Workbook): PurchaseRecord[] {
  const sheet = workbook.getWorksheet("PURCHASES");
  return sheet ? parsePurchaseRows(rowsToObjects(worksheetRows(sheet))) : [];
}

function parseValuationRows(rows: Record<string, string>[]): ValuationSnapshot[] {
  return rows.map((row) => ({
    collectionId: row["Collection ID"] ?? "",
    catalogId: row["Catalog ID"] ?? "",
    source: row.Source ?? "",
    valueType: row["Value Type"] ?? "",
    valueEur: parseAmount(row["Value EUR"]),
    snapshotDate: row["Snapshot Date"] ?? "",
    conditionBasis: row["Condition Basis"] ?? "",
    notes: row.Notes ?? "",
  })).filter((valuation) => valuation.collectionId || valuation.catalogId);
}

function parseValuations(workbook: ExcelJS.Workbook): ValuationSnapshot[] {
  const sheet = workbook.getWorksheet("VALUATIONS");
  return sheet ? parseValuationRows(rowsToObjects(worksheetRows(sheet))) : [];
}

function parseAmount(value: string | undefined): number | null {
  const raw = value?.trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, "").replace(/€/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  if (!/\d/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export class GoogleSheetsProvider implements CollectionDataProvider {
  private async credentials() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!email || !privateKey) throw new Error("Credenciais Google incompletas.");
    const auth = new GoogleAuth({
      credentials: { client_email: email, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/drive.readonly"],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) throw new Error("Não foi possível obter token Google.");
    return token.token;
  }

  private async getRange(range: string, token: string): Promise<string[][]> {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID em falta.");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
    const response = await measureServerFetch("google.sheet_range", () => fetch(url, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } }));
    if (!response.ok) throw new Error(`Google Sheets respondeu ${response.status} ao ler ${range}.`);
    const body = (await response.json()) as { values?: string[][] };
    return body.values ?? [];
  }

  private async readDriveWorkbook(token: string): Promise<RawSheetData> {
    const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!id) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID em falta.");
    const metadataResponse = await measureServerFetch("google.drive_metadata", () => fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=mimeType,name`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    }));
    if (!metadataResponse.ok) throw new Error(`Google Drive respondeu ${metadataResponse.status} ao identificar o ficheiro.`);
    const metadata = (await metadataResponse.json()) as { mimeType?: string; name?: string };
    if (metadata.mimeType !== XLSX_MIME) {
      return this.readNativeSheet(token);
    }

    const response = await measureServerFetch("google.workbook_download", () => fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    }));
    if (!response.ok) throw new Error(`Google Drive respondeu ${response.status} ao descarregar ${metadata.name ?? "a coleção"}.`);
    const workbookBytes = await measureServerWork("google.workbook_body", () => response.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await measureServerWork("google.xlsx_parse", async () => workbook.xlsx.load(Buffer.from(workbookBytes) as never));

    return measureServerWork("google.xlsx_to_records", async () => {
      const collectionSheet = workbook.getWorksheet("COLLECTION");
      const auditSheet = workbook.getWorksheet("AUDIT LOG");
      if (!collectionSheet || !auditSheet) throw new Error("O workbook tem de conter os separadores COLLECTION e AUDIT LOG.");

      const platformOverrides: Record<string, string> = {};
      for (const [sheetName, platform] of [["GB", "Game Boy"], ["GBC", "Game Boy Color"]]) {
        const sheet = workbook.getWorksheet(sheetName);
        if (!sheet) continue;
        for (const row of worksheetRows(sheet, 6)) {
          const idValue = row[1]?.trim();
          if (idValue) platformOverrides[idValue] = platform;
        }
      }
      return {
        collection: rowsToObjects(worksheetRows(collectionSheet)),
        audit: rowsToObjects(worksheetRows(auditSheet)),
        platformOverrides,
        wantlist: parsePlanTargets(workbook),
        purchases: parsePurchases(workbook),
        valuations: parseValuations(workbook),
      };
    });
  }

  private async readNativeSheet(token: string): Promise<RawSheetData> {
    const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!id) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID em falta.");
    const metadataResponse = await measureServerFetch("google.sheet_metadata", () => fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    }));
    if (!metadataResponse.ok) throw new Error(`Google Sheets respondeu ${metadataResponse.status} ao listar os separadores.`);
    const metadata = await metadataResponse.json() as { sheets?: { properties?: { title?: string } }[] };
    const names = (metadata.sheets ?? []).map((sheet) => sheet.properties?.title ?? "").filter(Boolean);
    if (!names.includes("COLLECTION") || !names.includes("AUDIT LOG")) throw new Error("A Google Sheet tem de conter COLLECTION e AUDIT LOG.");
    const wanted = names.filter((name) => ["COLLECTION", "AUDIT LOG", "GB", "GBC", "PURCHASES", "VALUATIONS"].includes(name) || normalizedHeader(name).includes("plan"));
    const values = await measureServerWork("google.sheet_ranges_parallel", () => Promise.all(wanted.map(async (name) => {
      const range = `'${name.replaceAll("'", "''")}'!${name === "AUDIT LOG" ? "A1:U1200" : ["GB", "GBC"].includes(name) ? "A1:Z300" : normalizedHeader(name).includes("plan") ? "A1:Z1500" : "A1:Z1200"}`;
      return [name, await this.getRange(range, token)] as const;
    })));

    return measureServerWork("google.sheet_transform", async () => {
      const rowsByName = new Map(values);
      const platformOverrides: Record<string, string> = {};
      for (const [sheetName, platform] of [["GB", "Game Boy"], ["GBC", "Game Boy Color"]]) {
        for (const row of (rowsByName.get(sheetName) ?? []).slice(5)) {
          const collectionId = row[1]?.trim();
          if (collectionId) platformOverrides[collectionId] = platform;
        }
      }
      const records = (name: string) => rowsToObjects(rowsByName.get(name) ?? []);
      const planNames = wanted.filter((name) => normalizedHeader(name).includes("plan"));
      return {
        collection: records("COLLECTION"),
        audit: records("AUDIT LOG"),
        platformOverrides,
        wantlist: planNames.flatMap((name) => parsePlanTargetRows(name, rowsByName.get(name) ?? [])),
        purchases: parsePurchaseRows(records("PURCHASES")),
        valuations: parseValuationRows(records("VALUATIONS")),
      };
    });
  }

  async read(): Promise<RawSheetData> {
    if (workbookCache && workbookCache.expiresAt > Date.now()) {
      recordServerPerf("google.provider_cache", 0, "hit");
      return workbookCache.data;
    }
    if (workbookRead) {
      recordServerPerf("google.provider_cache", 0, "in-flight");
      return measureServerWork("google.provider_wait", () => workbookRead!);
    }
    recordServerPerf("google.provider_cache", 0, "miss");
    workbookRead = measureServerWork("google.provider_load", () => this.load());
    try {
      const data = await workbookRead;
      workbookCache = { data, expiresAt: Date.now() + 60_000 };
      return data;
    } catch (error) {
      if (!workbookCache) throw error;
      console.warn("Google Sheets refresh failed; serving the last in-memory collection snapshot.", error);
      return workbookCache.data;
    } finally {
      workbookRead = null;
    }
  }

  private async load(): Promise<RawSheetData> {
    const token = await measureServerWork("google.auth_token", () => this.credentials());
    return this.readDriveWorkbook(token);
  }
}
