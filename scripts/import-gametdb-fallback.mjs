import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GAMES_FILE = path.join(ROOT, "data", "artwork-games.json");
const TGDB_MISSING_FILE = path.join(ROOT, "data", "artwork-tgdb-missing.json");
const FINAL_MISSING_FILE = path.join(ROOT, "data", "artwork-missing.json");
const REPORT_FILE = path.join(ROOT, "data", "artwork-gametdb-report.json");
const MANIFEST_FILE = path.join(ROOT, "public", "covers", "manifest.json");
const GENERATED_MODULE = path.join(ROOT, "src", "data", "game-artwork.ts");
const COVERS_DIR = path.join(ROOT, "public", "covers");

const SOURCES = {
  GameCube: {
    db: "https://www.gametdb.com/wiitdb.txt?LANG=EN",
    artSystem: "wii",
    coverTypes: ["cover"],
    extensions: ["png", "jpg"],
    codeRegex: /DOL[-\s]+(?:P[-\s]+)?([A-Z0-9]{4})/gi,
    idMatch: "prefix",
  },
  "Nintendo Wii": {
    db: "https://www.gametdb.com/wiitdb.txt?LANG=EN",
    artSystem: "wii",
    coverTypes: ["cover"],
    extensions: ["png", "jpg"],
    codeRegex: /RVL[-\s]+(?:P[-\s]+)?([A-Z0-9]{4})/gi,
    idMatch: "prefix",
  },
  "Nintendo DS": {
    db: "https://www.gametdb.com/dstdb.txt?LANG=EN",
    artSystem: "ds",
    coverTypes: ["coverHQ", "coverM", "cover"],
    extensions: ["jpg", "png"],
    codeRegex: /NTR[-\s]+(?:P[-\s]+)?([A-Z0-9]{4})/gi,
    idMatch: "exact",
  },
  "Nintendo 3DS": {
    db: "https://www.gametdb.com/3dstdb.txt?LANG=EN",
    artSystem: "3ds",
    coverTypes: ["coverHQ", "coverM", "cover"],
    extensions: ["jpg", "png"],
    codeRegex: /CTR[-\s]+(?:R[-\s]+|P[-\s]+)?([A-Z0-9]{4})/gi,
    idMatch: "exact",
  },
  "Nintendo Wii U": {
    db: "https://www.gametdb.com/wiiutdb.txt?LANG=EN",
    artSystem: "wiiu",
    coverTypes: ["coverHQ", "coverM", "cover"],
    extensions: ["jpg", "png"],
    codeRegex: /WUP[-\s]+(?:P[-\s]+)?([A-Z0-9]{4})/gi,
    idMatch: "prefix",
  },
  "Nintendo Switch": {
    db: "https://www.gametdb.com/switchtdb.txt?LANG=EN",
    artSystem: "switch",
    coverTypes: ["coverHQ", "coverM", "cover"],
    extensions: ["jpg", "png"],
    codeRegex: /HAC[-\s]+(?:P[-\s]+)?([A-Z0-9]{4})/gi,
    idMatch: "prefix",
  },
  "Playstation 3": {
    db: "https://www.gametdb.com/ps3tdb.txt?LANG=EN",
    artSystem: "ps3",
    coverTypes: ["coverM", "cover"],
    extensions: ["jpg", "png"],
    codeRegex: /\b(BLES\d{5}|BCES\d{5})\b/gi,
    idMatch: "exact",
  },
};

const EUROPE_MARKERS = [
  "EUR", "UKV", "EAP", "EUT", "EUU", "PORT", "POR", "ESP", "FRA", "ITA", "NOE", "GER",
  "AUS", "HOL", "SCN", "SWE", "NOR", "DAN", "FIN",
];

const NON_EUROPE_MARKERS = ["USA", "JPN", "JAP", "KOR", "ASI"];

function ascii(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalize(value) {
  return ascii(value)
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value) {
  return normalize(value)
    .replace(/\b(the|a|an|version)\b/g, " ")
    .replace(/\bspider man\b/g, "spiderman")
    .replace(/\bwarioware\b/g, "wario ware")
    .replace(/\s+/g, " ")
    .trim();
}

function diceCoefficient(a, b) {
  const bigrams = (value) => {
    const text = compact(value).replace(/\s/g, "");
    const set = new Set();
    for (let i = 0; i < text.length - 1; i += 1) set.add(text.slice(i, i + 2));
    return set;
  };
  const left = bigrams(a);
  const right = bigrams(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const item of left) if (right.has(item)) overlap += 1;
  return (2 * overlap) / (left.size + right.size);
}

function tokenCoverage(a, b) {
  const left = new Set(compact(a).split(" ").filter((token) => token.length > 1));
  const right = new Set(compact(b).split(" ").filter((token) => token.length > 1));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap / left.size;
}

function titleScore(requested, candidate) {
  const a = compact(requested);
  const b = compact(candidate);
  if (!a || !b) return -Infinity;
  if (a === b) return 1000;
  if (a.replace(/\s/g, "") === b.replace(/\s/g, "")) return 990;

  const coverage = tokenCoverage(requested, candidate);
  const dice = diceCoefficient(requested, candidate);
  if (coverage < 0.7 || dice < 0.5) return -Infinity;
  return Math.round(coverage * 600 + dice * 350);
}

function readJson(filePath, fallback) {
  return fs.readFile(filePath, "utf8").then(JSON.parse).catch(() => fallback);
}

function extractCodes(game, config) {
  const text = String(game.productCode ?? "").toUpperCase();
  const found = [];
  config.codeRegex.lastIndex = 0;
  for (const match of text.matchAll(config.codeRegex)) {
    const code = String(match[1] ?? "").toUpperCase();
    if (code && !found.includes(code)) found.push(code);
  }
  return found;
}

function productLooksPal(game, code) {
  const text = String(game.productCode ?? "").toUpperCase();
  const hasEuropeMarker = EUROPE_MARKERS.some((marker) => text.includes(marker));
  const hasNonEuropeMarker = NON_EUROPE_MARKERS.some((marker) => text.includes(marker));

  if (hasEuropeMarker) return true;
  if (hasNonEuropeMarker) return false;

  // Nintendo disc/cart product codes conventionally use P for PAL.
  if (code?.length === 4 && code.endsWith("P")) return true;

  // PlayStation 3 BLES / BCES prefixes are European.
  if (/^(BLES|BCES)\d{5}$/.test(code ?? "")) return true;

  return false;
}

function languageOrder(game) {
  const value = String(game.productCode ?? "").toUpperCase();
  if (/PORT|POR/.test(value)) return ["PT", "EN", "ES", "FR", "DE", "IT", "AU"];
  if (/ESP/.test(value)) return ["ES", "EN", "PT", "FR", "DE", "IT", "AU"];
  if (/FRA/.test(value)) return ["FR", "EN", "DE", "ES", "IT", "PT", "AU"];
  if (/ITA/.test(value)) return ["IT", "EN", "FR", "DE", "ES", "PT", "AU"];
  if (/NOE|GER/.test(value)) return ["DE", "EN", "FR", "ES", "IT", "PT", "AU"];
  if (/AUS/.test(value)) return ["AU", "EN", "PT", "ES", "FR", "DE", "IT"];
  return ["EN", "PT", "ES", "FR", "DE", "IT", "AU", "NL"];
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "MarioRetroCollection/1.0" },
  });
  if (!response.ok) throw new Error(`GameTDB database returned ${response.status}: ${url}`);
  return response.text();
}

function parseTitleDb(text) {
  const entries = [];
  for (const raw of text.split(/\r?\n/)) {
    const index = raw.indexOf(" = ");
    if (index <= 0) continue;
    const id = raw.slice(0, index).trim();
    const title = raw.slice(index + 3).trim();
    if (!id || id === "TITLES" || !title) continue;
    entries.push({ id, title });
  }
  return entries;
}

function chooseDatabaseEntry(entries, codes, config, game) {
  const candidates = [];
  for (const code of codes) {
    for (const entry of entries) {
      const matches = config.idMatch === "exact"
        ? entry.id.toUpperCase() === code
        : entry.id.toUpperCase().startsWith(code);
      if (!matches) continue;
      const score = titleScore(game.title, entry.title);
      if (!Number.isFinite(score)) continue;
      candidates.push({ ...entry, code, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return null;

  // Product-code matching is the primary identity check. Title similarity is a
  // guard against a mistyped/ambiguous code, not the sole matcher.
  if (best.score < 600) return null;
  return best;
}

async function findCover(config, gameId, game) {
  for (const language of languageOrder(game)) {
    for (const type of config.coverTypes) {
      for (const ext of config.extensions) {
        const url = `https://art.gametdb.com/${config.artSystem}/${type}/${language}/${gameId}.${ext}`;
        const head = await fetch(url, {
          method: "HEAD",
          headers: { "User-Agent": "MarioRetroCollection/1.0" },
        });
        if (head.ok) return { url, language, type, ext };
        if (head.status === 429) await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  return null;
}

async function download(url, destination) {
  const response = await fetch(url, {
    headers: { "User-Agent": "MarioRetroCollection/1.0" },
  });
  if (!response.ok) throw new Error(`GameTDB artwork returned ${response.status}: ${url}`);
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

await fs.mkdir(COVERS_DIR, { recursive: true });

const [games, tgdbMissing, manifest] = await Promise.all([
  readJson(GAMES_FILE, []),
  readJson(TGDB_MISSING_FILE, { entries: [] }),
  readJson(MANIFEST_FILE, { entries: {} }),
]);

const gamesById = new Map(games.map((game) => [game.collectionId, game]));
const missingCandidates = (tgdbMissing.entries ?? []).filter((entry) => !manifest.entries?.[entry.collectionId]);

const databaseCache = new Map();
for (const platform of [...new Set(missingCandidates.map((entry) => entry.platform))]) {
  const config = SOURCES[platform];
  if (!config) continue;
  if (!databaseCache.has(config.db)) {
    databaseCache.set(config.db, parseTitleDb(await fetchText(config.db)));
  }
}

const unresolved = [];
const resolved = [];
let downloaded = 0;

for (const entry of tgdbMissing.entries ?? []) {
  const game = gamesById.get(entry.collectionId) ?? entry;

  if (manifest.entries?.[game.collectionId]) {
    continue;
  }

  const config = SOURCES[game.platform];
  if (!config) {
    unresolved.push({ ...entry, fallbackReason: "gametdb-unsupported-platform" });
    continue;
  }

  const codes = extractCodes(game, config);
  const palCodes = codes.filter((code) => productLooksPal(game, code));

  if (!palCodes.length) {
    unresolved.push({
      ...entry,
      fallbackReason: codes.length ? "physical-product-code-not-pal" : "no-usable-product-code",
      gametdbCodes: codes,
    });
    continue;
  }

  const dbEntries = databaseCache.get(config.db) ?? [];
  const match = chooseDatabaseEntry(dbEntries, palCodes, config, game);

  if (!match) {
    unresolved.push({
      ...entry,
      fallbackReason: "product-code-not-found-or-title-mismatch",
      gametdbCodes: palCodes,
    });
    continue;
  }

  const cover = await findCover(config, match.id, game);
  if (!cover) {
    unresolved.push({
      ...entry,
      fallbackReason: "no-pal-cover-for-exact-product-code",
      gametdbId: match.id,
      gametdbTitle: match.title,
      gametdbCodes: palCodes,
    });
    continue;
  }

  const ext = `.${cover.ext}`;
  const relativeFile = `/covers/${game.collectionId}${ext}`;
  const destination = path.join(ROOT, "public", relativeFile.replace(/^\//, ""));

  for (const oldExt of [".png", ".jpg", ".jpeg", ".webp"]) {
    if (oldExt !== ext) {
      await fs.rm(path.join(COVERS_DIR, `${game.collectionId}${oldExt}`), { force: true });
    }
  }

  await download(cover.url, destination);

  manifest.entries[game.collectionId] = {
    file: relativeFile,
    source: "gametdb",
    gametdbId: match.id,
    gametdbTitle: match.title,
    matchedBy: "physical-product-code",
    productCode: game.productCode,
    regionName: "PAL",
    artworkLanguage: cover.language,
    artworkType: cover.type,
    sourceImage: cover.url,
    matchScore: match.score,
  };

  resolved.push({
    collectionId: game.collectionId,
    platform: game.platform,
    title: game.title,
    gametdbId: match.id,
    gametdbTitle: match.title,
    artworkLanguage: cover.language,
    artworkType: cover.type,
    matchScore: match.score,
  });
  downloaded += 1;

  if (downloaded % 10 === 0) {
    console.log(`Downloaded ${downloaded} GameTDB fallback covers...`);
  }

  await new Promise((resolve) => setTimeout(resolve, 120));
}

const sortedEntries = Object.fromEntries(
  Object.entries(manifest.entries ?? {}).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true }),
  ),
);
manifest.entries = sortedEntries;
manifest.source = "local-artwork";
manifest.sources = [...new Set(Object.values(sortedEntries).map((entry) => entry.source).filter(Boolean))];
manifest.totalOwnedGames = games.length;
manifest.matched = Object.keys(sortedEntries).length;
manifest.missing = unresolved.length;
manifest.generatedAt = new Date().toISOString();

const artworkMap = Object.fromEntries(
  Object.entries(sortedEntries).map(([id, entry]) => [id, entry.file]),
);

await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");
await fs.writeFile(
  FINAL_MISSING_FILE,
  JSON.stringify({
    generatedAt: manifest.generatedAt,
    source: "local-artwork",
    sourcesTried: ["thegamesdb", "gametdb"],
    regionPolicy: "PAL-Europe",
    totalOwnedGames: games.length,
    matched: manifest.matched,
    missing: unresolved.length,
    entries: unresolved,
  }, null, 2) + "\n",
);
await fs.writeFile(
  REPORT_FILE,
  JSON.stringify({
    generatedAt: manifest.generatedAt,
    source: "gametdb",
    attempted: missingCandidates.length,
    resolved: resolved.length,
    unresolved: unresolved.length,
    entries: resolved,
  }, null, 2) + "\n",
);
await fs.writeFile(
  GENERATED_MODULE,
  `// Generated by the artwork importer. Do not edit by hand.\nexport const GAME_ARTWORK: Record<string, string> = ${JSON.stringify(artworkMap, null, 2)};\n`,
);

console.log("");
console.log(`GameTDB fallback resolved: ${resolved.length}`);
console.log(`Total local artwork: ${manifest.matched}/${games.length}`);
console.log(`Still missing: ${unresolved.length}`);

// pipeline-version: 1
