import fs from "node:fs";
import path from "node:path";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { GoogleAuth } from "google-auth-library";

const outputPath = path.join(process.cwd(), "src/data/collection-snapshot.json");
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!spreadsheetId || !email || !privateKey) {
  throw new Error("Credenciais Google incompletas para refresh do snapshot da coleção.");
}

function normalizedHeader(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function rowsToObjects(values) {
  const [headers = [], ...rows] = values;
  return rows
    .filter((row) => row.some((cell) => String(cell ?? "").trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [String(header ?? "").trim(), String(row[index] ?? "").trim()])));
}

function parseAmount(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, "").replace(/€/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  if (!/\d/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function platformFromPlanTab(name) {
  const source = name.split("—")[0].replace(/\s+PLAN\s*$/i, "").split("-")[0].trim().toUpperCase();
  const labels = {
    NES: "NES", SNES: "SNES", N64: "Nintendo 64", GAMECUBE: "GameCube", WII: "Nintendo Wii",
    "WII U": "Nintendo Wii U", SWITCH: "Nintendo Switch", GB: "Game Boy", GBC: "Game Boy Color",
    GBA: "GameBoy Advance", DS: "Nintendo DS", "3DS": "Nintendo 3DS", PS1: "Playstation",
    PS2: "Playstation 2", PS3: "Playstation 3", PS5: "Playstation 5", PSP: "PSP", PC: "PC",
  };
  return labels[source] ?? source;
}

function parsePlanTargetRows(name, values) {
  const rows = values.filter((row) => row.some((cell) => String(cell ?? "").trim()));
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizedHeader);
    return headers.includes("id alvo") && headers.includes("jogo em falta");
  });
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map(normalizedHeader);
  const column = (field) => headers.indexOf(normalizedHeader(field));
  const get = (row, field) => String(row[column(field)] ?? "").trim();
  const targets = [];
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

function parsePurchaseRows(rows) {
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

function parseValuationRows(rows) {
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

const auth = new GoogleAuth({
  credentials: { client_email: email, private_key: privateKey },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const client = await auth.getClient();
const accessToken = await client.getAccessToken();
if (!accessToken.token) throw new Error("Não foi possível obter token Google.");
const headers = { Authorization: `Bearer ${accessToken.token}` };

async function googleJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Google Sheets respondeu ${response.status}.`);
  return response.json();
}

async function getRange(range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
  const body = await googleJson(url);
  return body.values ?? [];
}

const metadata = await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`);
const names = (metadata.sheets ?? []).map((sheet) => sheet.properties?.title ?? "").filter(Boolean);
if (!names.includes("COLLECTION") || !names.includes("AUDIT LOG")) {
  throw new Error("A Google Sheet tem de conter COLLECTION e AUDIT LOG.");
}

const wanted = names.filter((name) => ["COLLECTION", "AUDIT LOG", "GB", "GBC", "PURCHASES", "VALUATIONS"].includes(name) || normalizedHeader(name).includes("plan"));
const values = await Promise.all(wanted.map(async (name) => {
  const range = `'${name.replaceAll("'", "''")}'!${name === "AUDIT LOG" ? "A1:U1200" : ["GB", "GBC"].includes(name) ? "A1:Z300" : normalizedHeader(name).includes("plan") ? "A1:Z1500" : "A1:Z1200"}`;
  return [name, await getRange(range)];
}));
const rowsByName = new Map(values);
const records = (name) => rowsToObjects(rowsByName.get(name) ?? []);
const platformOverrides = {};
for (const [sheetName, platform] of [["GB", "Game Boy"], ["GBC", "Game Boy Color"]]) {
  for (const row of (rowsByName.get(sheetName) ?? []).slice(5)) {
    const collectionId = String(row[1] ?? "").trim();
    if (collectionId) platformOverrides[collectionId] = platform;
  }
}
const planNames = wanted.filter((name) => normalizedHeader(name).includes("plan"));
const raw = {
  collection: records("COLLECTION"),
  audit: records("AUDIT LOG"),
  platformOverrides,
  wantlist: planNames.flatMap((name) => parsePlanTargetRows(name, rowsByName.get(name) ?? [])),
  purchases: parsePurchaseRows(records("PURCHASES")),
  valuations: parseValuationRows(records("VALUATIONS")),
};

if (!raw.collection.length || !raw.audit.length) {
  throw new Error("Snapshot recusado: COLLECTION/AUDIT LOG vazios.");
}

const key = createHash("sha256").update(privateKey, "utf8").digest();
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", key, iv);
const ciphertext = Buffer.concat([cipher.update(JSON.stringify(raw), "utf8"), cipher.final()]);
const envelope = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  algorithm: "aes-256-gcm",
  iv: iv.toString("base64"),
  tag: cipher.getAuthTag().toString("base64"),
  ciphertext: ciphertext.toString("base64"),
};

fs.writeFileSync(outputPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
console.log("Encrypted collection snapshot written.");
