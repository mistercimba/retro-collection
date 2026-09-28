import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { GoogleAuth } from "google-auth-library";

const out = path.join(process.cwd(), "src/data/collection-snapshot.json");
const text = (value) => {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0,10);
  if (typeof value === "object") {
    if ("result" in value) return text(value.result);
    if ("text" in value) return String(value.text ?? "").trim();
    if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
    if ("hyperlink" in value) return String(value.text ?? value.hyperlink ?? "").trim();
  }
  return String(value).trim();
};
const rowsToObjects = (rows) => {
  const [headers = [], ...body] = rows;
  return body.filter((row) => row.some((cell) => String(cell).trim())).map((row) => Object.fromEntries(headers.map((header, i) => [String(header).trim(), row[i] ?? ""])));
};
const rows = (sheet, firstRow = 1) => {
  const result = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    if (row.number < firstRow) return;
    result.push(Array.from({ length: sheet.columnCount }, (_, i) => text(row.getCell(i + 1).value)));
  });
  return result;
};
const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const amount = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw.replace(/\s/g, "").replace(/€/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const planPlatform = (name) => {
  const source = name.split("—")[0].replace(/\s+PLAN\s*$/i, "").split("-")[0].trim().toUpperCase();
  return ({NES:"NES",SNES:"SNES",N64:"Nintendo 64",GAMECUBE:"GameCube",WII:"Nintendo Wii","WII U":"Nintendo Wii U",SWITCH:"Nintendo Switch",GB:"Game Boy",GBC:"Game Boy Color",GBA:"GameBoy Advance",DS:"Nintendo DS","3DS":"Nintendo 3DS",PS1:"Playstation",PS2:"Playstation 2",PS3:"Playstation 3",PS5:"Playstation 5",PSP:"PSP",PC:"PC"})[source] ?? source;
};
const parsePlans = (sheet) => {
  const values = rows(sheet);
  const headerAt = values.findIndex((row) => row.map(normalize).includes("id alvo") && row.map(normalize).includes("jogo em falta"));
  if (headerAt < 0) return [];
  const headers = values[headerAt].map(normalize);
  const get = (row, name) => { const i = headers.indexOf(normalize(name)); return row[i]?.trim() ?? ""; };
  return values.slice(headerAt + 1).map((row) => ({ platform: planPlatform(sheet.name), priority: get(row,"Prioridade"), targetId: get(row,"ID/alvo"), title: get(row,"Jogo em falta"), reason: get(row,"Porque importa"), targetVersion: get(row,"Versão / condição alvo"), priceCeilingEur: amount(get(row,"Teto validado")), status: get(row,"Estado"), notes: get(row,"Notas / pesquisa") })).filter((entry) => entry.targetId && entry.title);
};
async function loadWorkbook() {
  const { GOOGLE_SERVICE_ACCOUNT_EMAIL: email, GOOGLE_PRIVATE_KEY: key, GOOGLE_SHEETS_SPREADSHEET_ID: id } = process.env;
  if (!email || !key || !id) throw new Error("Google credentials missing");
  const auth = new GoogleAuth({ credentials: { client_email: email, private_key: key.replace(/\\n/g,"\n") }, scopes: ["https://www.googleapis.com/auth/drive.readonly","https://www.googleapis.com/auth/spreadsheets.readonly"] });
  const client = await auth.getClient(); const token = (await client.getAccessToken()).token;
  if (!token) throw new Error("Google token missing");
  const metaResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=mimeType`, { headers: { Authorization: `Bearer ${token}` } });
  if (!metaResponse.ok) throw new Error(`Drive metadata ${metaResponse.status}`);
  const mime = (await metaResponse.json()).mimeType;
  const workbook = new ExcelJS.Workbook();
  if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Drive download ${response.status}`);
    await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
  } else {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties.title`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Sheets metadata ${response.status}`);
    const names = (await response.json()).sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) ?? [];
    const wanted = names.filter((name) => ["COLLECTION","AUDIT LOG","GB","GBC","PURCHASES","VALUATIONS"].includes(name) || normalize(name).includes("plan"));
    await Promise.all(wanted.map(async (name) => {
      const range = name === "AUDIT LOG" ? "A1:U1200" : ["GB","GBC"].includes(name) ? "A1:Z300" : normalize(name).includes("plan") ? "A1:Z1500" : "A1:Z1200";
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(`'${name.replaceAll("'","''")}'!${range}`)}?majorDimension=ROWS`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Sheets ${name} ${response.status}`);
      workbook.addWorksheet(name).addRows((await response.json()).values ?? []);
    }));
  }
  return workbook;
}
const workbook = await loadWorkbook();
const collectionSheet = workbook.getWorksheet("COLLECTION");
const auditSheet = workbook.getWorksheet("AUDIT LOG");
if (!collectionSheet || !auditSheet) throw new Error("Required sheets missing");
const platformOverrides = {};
for (const [name, platform] of [["GB","Game Boy"],["GBC","Game Boy Color"]]) {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) continue;
  for (const row of rows(sheet, 6)) if (row[1]?.trim()) platformOverrides[row[1].trim()] = platform;
}
const planSheets = workbook.worksheets.filter((sheet) => normalize(sheet.name).includes("plan"));
const data = {
  collection: rowsToObjects(rows(collectionSheet)),
  audit: rowsToObjects(rows(auditSheet)),
  platformOverrides,
  wantlist: planSheets.flatMap(parsePlans),
  purchases: workbook.getWorksheet("PURCHASES") ? rowsToObjects(rows(workbook.getWorksheet("PURCHASES"))) : [],
  valuations: workbook.getWorksheet("VALUATIONS") ? rowsToObjects(rows(workbook.getWorksheet("VALUATIONS"))) : []
};
await fs.writeFile(out, JSON.stringify({ schemaVersion: 1, refreshedAt: new Date().toISOString(), data }, null, 2) + "\n");
console.log(`Collection snapshot refreshed: ${data.collection.length} rows, ${data.audit.length} audit rows.`);
