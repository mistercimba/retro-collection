import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const API_BASE = "https://api.thegamesdb.net";
const apiKey = process.env.THEGAMESDB_API_KEY;
const FORCE = process.argv.includes("--force");

if (!apiKey) {
  throw new Error("THEGAMESDB_API_KEY is not configured");
}

const GAMES_FILE = path.join(ROOT, "data", "artwork-games.json");
const OVERRIDES_FILE = path.join(ROOT, "data", "artwork-overrides.json");
const COVERS_DIR = path.join(ROOT, "public", "covers");
const MANIFEST_FILE = path.join(COVERS_DIR, "manifest.json");
const TGDB_MISSING_FILE = path.join(ROOT, "data", "artwork-tgdb-missing.json");
const FINAL_MISSING_FILE = path.join(ROOT, "data", "artwork-missing.json");
const REPORT_FILE = path.join(ROOT, "data", "artwork-tgdb-report.json");
const GENERATED_MODULE = path.join(ROOT, "src", "data", "game-artwork.ts");

const PLATFORM_ALIASES = {
  NES: ["Nintendo Entertainment System (NES)", "Nintendo Entertainment System", "NES"],
  SNES: ["Super Nintendo (SNES)", "Super Nintendo Entertainment System", "SNES"],
  "Nintendo 64": ["Nintendo 64", "N64"],
  "Game Boy": ["Nintendo Game Boy", "Game Boy"],
  "Game Boy Color": ["Nintendo Game Boy Color", "Game Boy Color"],
  "GameBoy + Color": ["Nintendo Game Boy", "Game Boy"],
  "GameBoy Advance": ["Nintendo Game Boy Advance", "Game Boy Advance", "GBA"],
  "Nintendo DS": ["Nintendo DS", "NDS"],
  "Nintendo 3DS": ["Nintendo 3DS", "3DS"],
  GameCube: ["Nintendo GameCube", "GameCube"],
  "Nintendo Wii": ["Nintendo Wii", "Wii"],
  "Nintendo Wii U": ["Nintendo Wii U", "Wii U"],
  "Nintendo Switch": ["Nintendo Switch", "Switch"],
  Playstation: ["Sony Playstation", "Sony PlayStation", "PlayStation"],
  "Playstation 2": ["Sony Playstation 2", "Sony PlayStation 2", "PlayStation 2", "PS2"],
  "Playstation 3": ["Sony Playstation 3", "Sony PlayStation 3", "PlayStation 3", "PS3"],
  "Playstation 5": ["Sony Playstation 5", "Sony PlayStation 5", "PlayStation 5", "PS5"],
  PSP: ["Sony PSP", "Sony Playstation Portable", "PlayStation Portable", "PSP"],
  PC: ["PC", "Microsoft Windows", "Windows PC"],
};

const SPECIAL_EDITION_TERMS = [
  "platinum",
  "greatest hits",
  "players choice",
  "player s choice",
  "essentials",
  "bundle",
  "not for resale",
  "demo",
  "beta",
  "prototype",
  "proto",
  "promo",
  "classics",
];

const ROMAN = new Map([
  ["i", "1"],
  ["ii", "2"],
  ["iii", "3"],
  ["iv", "4"],
  ["v", "5"],
  ["vi", "6"],
  ["vii", "7"],
  ["viii", "8"],
  ["ix", "9"],
  ["x", "10"],
]);

let lastAllowance = null;

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

function canonicalTitle(value) {
  return normalize(value)
    .replace(/\bversion\b/g, " ")
    .replace(/\bclassic nes series\b/g, " ")
    .replace(/\bnes classics\b/g, " ")
    .replace(/\bspider man\b/g, "spiderman")
    .replace(/\bwarioware\b/g, "wario ware")
    .replace(/\s+/g, " ")
    .trim();
}

function baseTitle(value) {
  return canonicalTitle(String(value ?? "").replace(/\[[^\]]+\]/g, " ").replace(/\([^)]*\)/g, " "));
}

function compactTitle(value) {
  return baseTitle(value).replace(/\s/g, "");
}

function stripLeadingArticle(value) {
  return baseTitle(value).replace(/^(the|a|an)\s+/, "");
}

function significantTokens(value) {
  return baseTitle(value)
    .split(" ")
    .filter((token) =>
      /^\d+$/.test(token) ||
      ROMAN.has(token) ||
      (token.length > 1 && !["the", "a", "an", "and", "of"].includes(token))
    );
}

function numberSignature(value) {
  return significantTokens(value)
    .filter((token) => /^\d+$/.test(token) || ROMAN.has(token))
    .map((token) => ROMAN.get(token) ?? token)
    .join(",");
}

function diceCoefficient(a, b) {
  const make = (value) => {
    const text = compactTitle(value);
    const set = new Set();
    for (let i = 0; i < text.length - 1; i += 1) set.add(text.slice(i, i + 2));
    return set;
  };
  const left = make(a);
  const right = make(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const item of left) if (right.has(item)) overlap += 1;
  return (2 * overlap) / (left.size + right.size);
}

function tokenMetrics(requested, candidate) {
  const left = new Set(significantTokens(requested));
  const right = new Set(significantTokens(candidate));
  if (!left.size || !right.size) return { coverage: 0, precision: 0 };
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return {
    coverage: overlap / left.size,
    precision: overlap / right.size,
  };
}

function scoreSingleName(requested, candidate) {
  const requestedBase = baseTitle(requested);
  const candidateBase = baseTitle(candidate);
  if (!requestedBase || !candidateBase) return -Infinity;

  const requestedNumbers = numberSignature(requested);
  const candidateNumbers = numberSignature(candidate);
  if (requestedNumbers && requestedNumbers !== candidateNumbers) return -Infinity;

  if (requestedBase === candidateBase) return 1000;
  if (compactTitle(requested) === compactTitle(candidate)) return 985;
  if (stripLeadingArticle(requested) === stripLeadingArticle(candidate)) return 970;

  const { coverage, precision } = tokenMetrics(requested, candidate);
  const dice = diceCoefficient(requested, candidate);
  if (coverage < 0.88 || precision < 0.72 || dice < 0.68) return -Infinity;

  return Math.round(600 + coverage * 160 + precision * 80 + dice * 120);
}

function bestNameScore(requested, game) {
  const names = [game.game_title, ...(Array.isArray(game.alternates) ? game.alternates : [])].filter(Boolean);
  let best = { score: -Infinity, matchedName: null };
  for (const name of names) {
    const score = scoreSingleName(requested, name);
    if (score > best.score) best = { score, matchedName: name };
  }
  return best;
}

function specialReleaseTerms(title) {
  const raw = ascii(title);
  const contextual = [];
  const bracketParts = [...raw.matchAll(/[\[(]([^\])]+)[\])]/g)].map((match) => normalize(match[1]));
  for (const term of SPECIAL_EDITION_TERMS) {
    if (bracketParts.some((part) => part.includes(term))) contextual.push(term);
  }

  const normalized = normalize(title);
  for (const term of ["greatest hits", "players choice", "player s choice", "essentials", "case bundle", "not for resale"]) {
    if (normalized.includes(term)) contextual.push(term);
  }

  return [...new Set(contextual)];
}

function specialEditionScore(game, localEdition) {
  const edition = normalize(localEdition);
  const specials = specialReleaseTerms(game.game_title);
  if (!specials.length) return edition && edition !== "standard" ? 0 : 30;

  if (!edition || edition === "standard") return -Infinity;
  if (specials.some((term) => edition.includes(term) || term.includes(edition))) return 160;
  return -Infinity;
}

function hasEditionMismatch(remoteTitle, localEdition) {
  return !Number.isFinite(specialEditionScore({ game_title: remoteTitle }, localEdition));
}

function productCountryHint(productCode) {
  const code = normalize(productCode);
  if (/\bukv\b/.test(code)) return /united kingdom|great britain|uk/i;
  if (/\bfra\b/.test(code)) return /france/i;
  if (/\bnoe\b|\bger\b/.test(code)) return /germany/i;
  if (/\bspa\b|\besp\b/.test(code)) return /spain/i;
  if (/\bita\b/.test(code)) return /italy/i;
  if (/\baus\b/.test(code)) return /australia/i;
  return null;
}

function languageCountryHint(language) {
  const value = normalize(language);
  if (!value || /unknown|multi|various/.test(value)) return null;
  if (/english|ingles|en\b/.test(value)) return /united kingdom|great britain|ireland/i;
  if (/french|frances|fr\b/.test(value)) return /france/i;
  if (/german|alemao|de\b/.test(value)) return /germany/i;
  if (/spanish|espanhol|es\b/.test(value)) return /spain/i;
  if (/italian|italiano|it\b/.test(value)) return /italy/i;
  if (/portuguese|portugues|pt\b/.test(value)) return /portugal/i;
  return null;
}

function resolutionPixels(image) {
  const match = String(image?.resolution ?? "").match(/(\d+)x(\d+)/i);
  return match ? Number(match[1]) * Number(match[2]) : 0;
}

function chooseFrontBoxart(payload, gameId) {
  const art = payload?.include?.boxart?.data?.[String(gameId)] ?? [];
  return art
    .filter((image) => image?.type === "boxart" && image?.side === "front" && image?.filename)
    .sort((a, b) => resolutionPixels(b) - resolutionPixels(a))[0] ?? null;
}

function inputKey(game, override) {
  return JSON.stringify({
    title: game.title,
    platform: game.platform,
    edition: game.edition ?? "",
    regionPolicy: "PAL-Europe",
    override: override ?? null,
  });
}

function fingerprint(game, override) {
  return createHash("sha1")
    .update(inputKey(game, override))
    .digest("hex")
    .slice(0, 16);
}

function flattenCollection(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : Object.values(value);
}

function resolvePlatform(platforms, localPlatform) {
  const aliases = PLATFORM_ALIASES[localPlatform] ?? [localPlatform];
  const normalizedAliases = aliases.map(normalize);
  const exact = platforms.find((platform) => {
    const candidates = [platform?.name, platform?.alias].filter(Boolean).map(normalize);
    return candidates.some((candidate) => normalizedAliases.includes(candidate));
  });
  if (exact) return exact;

  return platforms.find((platform) => {
    const name = normalize(platform?.name);
    return normalizedAliases.some((alias) => alias.length > 3 && (name.includes(alias) || alias.includes(name)));
  }) ?? null;
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function apiGet(endpoint, params = {}) {
  const url = new URL(endpoint, API_BASE);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "MarioRetroCollection/1.0" },
    });
    const text = await response.text();

    if (response.ok) {
      const payload = JSON.parse(text);
      if (Number.isFinite(payload?.remaining_monthly_allowance)) {
        lastAllowance = payload.remaining_monthly_allowance;
      }
      return payload;
    }

    if (response.status === 403) {
      throw new Error(`${endpoint} returned 403 (invalid API key or allowance exhausted)`);
    }

    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 5) {
      throw new Error(`${endpoint} returned ${response.status}: ${text.slice(0, 240)}`);
    }

    const retryAfter = Number(response.headers.get("retry-after") ?? 0);
    await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, attempt * 1200)));
  }

  throw new Error(`${endpoint} failed after retries`);
}

async function download(url, destination) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": "MarioRetroCollection/1.0" } });
    if (response.ok) {
      await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (attempt === 4) throw new Error(`Image download returned ${response.status}: ${url}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 800));
  }
}

function extensionFromFilename(filename) {
  const ext = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return ext === ".jpeg" ? ".jpg" : ext;
  return ".jpg";
}

function remoteImageUrl(payload, image) {
  const base = payload?.include?.boxart?.base_url?.original;
  if (!base || !image?.filename) return null;
  return new URL(image.filename, base).href;
}

function countryName(countriesById, countryId) {
  return countriesById.get(Number(countryId)) ?? "";
}

function candidateSummary(entry, countriesById) {
  return {
    id: entry.game.id,
    title: entry.game.game_title,
    regionId: entry.game.region_id ?? null,
    country: countryName(countriesById, entry.game.country_id),
    matchedName: entry.matchedName,
    nameScore: entry.nameScore,
    score: entry.score,
    hasFrontBoxart: Boolean(entry.front),
  };
}

function rankCandidates(payload, requestedTitle, localGame, targetPlatformId, europeRegionId, countriesById, override) {
  const countryHint = productCountryHint(localGame.productCode);
  const languageHint = languageCountryHint(localGame.language);
  return (payload?.data?.games ?? [])
    .filter((game) => Number(game?.platform) === Number(targetPlatformId))
    .filter((game) => Number(game?.region_id) === Number(europeRegionId))
    .map((game) => {
      const { score: nameScore, matchedName } = bestNameScore(requestedTitle, game);
      if (!Number.isFinite(nameScore)) return null;

      const editionScore = specialEditionScore(game, localGame.edition);
      if (!Number.isFinite(editionScore)) return null;

      let score = nameScore + 500 + editionScore;
      const country = countryName(countriesById, game.country_id);
      if (countryHint && countryHint.test(country)) score += 60;
      else if (languageHint && languageHint.test(country)) score += 35;
      else if (!game.country_id || Number(game.country_id) === 0) score += 15;

      if (scoreSingleName(requestedTitle, game.game_title) >= 970) score += 25;
      if (override?.tgdbGameId && Number(game.id) === Number(override.tgdbGameId)) score += 1000;

      return {
        game,
        matchedName,
        nameScore,
        score,
        front: chooseFrontBoxart(payload, game.id),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

function sameIdentity(a, b) {
  if (!a || !b) return false;
  return (
    baseTitle(a.game.game_title) === baseTitle(b.game.game_title) ||
    (a.matchedName && b.matchedName && baseTitle(a.matchedName) === baseTitle(b.matchedName))
  );
}

async function fetchGamePayload(searchTitle, platformId, override) {
  if (override?.tgdbGameId) {
    return apiGet("/v1/Games/ByGameID", {
      id: override.tgdbGameId,
      fields: "platform,alternates",
      include: "boxart,platform",
    });
  }

  return apiGet("/v1.1/Games/ByGameName", {
    name: searchTitle,
    "filter[platform]": platformId,
    fields: "platform,alternates",
    include: "boxart,platform",
  });
}

await fs.mkdir(COVERS_DIR, { recursive: true });

const games = await readJsonIfExists(GAMES_FILE, []);
const overrides = await readJsonIfExists(OVERRIDES_FILE, {});
const existingManifest = await readJsonIfExists(MANIFEST_FILE, { entries: {} });
const existingMissingFile = await readJsonIfExists(TGDB_MISSING_FILE, { entries: [] });

const [limitPayload, regionsPayload, countriesPayload, platformsPayload] = await Promise.all([
  apiGet("/v1/API/Limit"),
  apiGet("/v1/Regions"),
  apiGet("/v1/Countries"),
  apiGet("/v1/Platforms"),
]);

const regions = flattenCollection(regionsPayload?.data?.regions);
const countries = flattenCollection(countriesPayload?.data?.countries);
const platforms = flattenCollection(platformsPayload?.data?.platforms);
const countriesById = new Map(countries.map((country) => [Number(country.id), String(country.name ?? "")]));

const europeRegion =
  regions.find((region) => /^europe$/i.test(String(region?.name ?? ""))) ??
  regions.find((region) => /europe|pal/i.test(String(region?.name ?? ""))) ??
  { id: 6, name: "Europe" };

const platformMap = new Map();
for (const localPlatform of [...new Set(games.map((game) => game.platform))]) {
  platformMap.set(localPlatform, resolvePlatform(platforms, localPlatform));
}

const reusable = new Map();
const preservedFallback = new Map();
for (const game of games) {
  const entry = existingManifest.entries?.[game.collectionId];
  if (!entry?.file || entry.source === "thegamesdb") continue;
  try {
    await fs.access(path.join(ROOT, "public", entry.file.replace(/^\//, "")));
    preservedFallback.set(game.collectionId, entry);
  } catch {}
}

if (!FORCE) {
  for (const game of games) {
    const override = overrides[game.collectionId] ?? null;
    const entry = existingManifest.entries?.[game.collectionId];
    if (!entry || (entry.source && entry.source !== "thegamesdb")) continue;
    if (!entry || entry.fingerprint !== fingerprint(game, override) || !entry.file) continue;
    const platform = platformMap.get(game.platform);
    const stillValid =
      Number(entry.regionId) === Number(europeRegion.id) &&
      platform &&
      Number(entry.platformId) === Number(platform.id) &&
      scoreSingleName(game.title, entry.matchedName ?? entry.tgdbTitle) >= 900 &&
      !hasEditionMismatch(entry.tgdbTitle, game.edition);
    if (!stillValid) continue;
    try {
      await fs.access(path.join(ROOT, "public", entry.file.replace(/^\//, "")));
      reusable.set(game.collectionId, entry);
    } catch {}
  }
}

const reusableMissing = new Map();
if (!FORCE && existingMissingFile?.source === "thegamesdb") {
  for (const entry of existingMissingFile.entries ?? []) {
    const game = games.find((candidate) => candidate.collectionId === entry.collectionId);
    if (!game) continue;
    const override = overrides[game.collectionId] ?? null;
    if (entry.inputKey === inputKey(game, override)) {
      reusableMissing.set(game.collectionId, entry);
    }
  }
}

const uniqueQueries = new Set();
for (const game of games) {
  if (
    reusable.has(game.collectionId) ||
    reusableMissing.has(game.collectionId) ||
    preservedFallback.has(game.collectionId)
  ) continue;
  const platform = platformMap.get(game.platform);
  if (!platform) continue;
  const override = overrides[game.collectionId] ?? null;
  const searchTitle = override?.searchTitle ?? game.title;
  uniqueQueries.add(override?.tgdbGameId
    ? `id:${override.tgdbGameId}`
    : `${platform.id}:${normalize(searchTitle)}`);
}

const remaining = Number(limitPayload?.remaining_monthly_allowance ?? lastAllowance ?? 0);
if (remaining && remaining < uniqueQueries.size + 5) {
  throw new Error(`TheGamesDB allowance too low: need about ${uniqueQueries.size + 5}, remaining ${remaining}`);
}

console.log(`TheGamesDB allowance before import: ${remaining || "unknown"}`);
console.log(`PAL region: ${europeRegion.name} (#${europeRegion.id})`);
console.log(`Games: ${games.length}; API lookups needed: ${uniqueQueries.size}; reusable covers: ${reusable.size}; cached misses: ${reusableMissing.size}`);

const manifest = {
  generatedAt: new Date().toISOString(),
  source: "local-artwork",
  sources: ["thegamesdb", ...(preservedFallback.size ? ["gametdb"] : [])],
  sourceUrl: "https://thegamesdb.net",
  regionPolicy: "PAL-Europe",
  region: { id: Number(europeRegion.id), name: String(europeRegion.name ?? "Europe") },
  totalOwnedGames: games.length,
  entries: Object.fromEntries(preservedFallback),
};

const missing = [];
const queryCache = new Map();
const downloadedUrlToPath = new Map();
let matched = preservedFallback.size;
let reusedCount = preservedFallback.size;
let apiLookups = 0;

for (const [index, game] of games.entries()) {
  const override = overrides[game.collectionId] ?? null;
  const fp = fingerprint(game, override);
  const fallbackExisting = preservedFallback.get(game.collectionId);
  if (fallbackExisting) {
    // Stronger exact-code / serial-derived artwork wins over a looser API search.
    continue;
  }

  const existing = reusable.get(game.collectionId);

  if (existing) {
    manifest.entries[game.collectionId] = existing;
    matched += 1;
    reusedCount += 1;
    continue;
  }

  const cachedMissing = reusableMissing.get(game.collectionId);
  if (cachedMissing) {
    missing.push(cachedMissing);
    continue;
  }

  const platform = platformMap.get(game.platform);
  if (!platform) {
    missing.push({ ...game, reason: "unsupported-platform" });
    continue;
  }

  const searchTitle = override?.searchTitle ?? game.title;
  const cacheKey = override?.tgdbGameId
    ? `id:${override.tgdbGameId}`
    : `${platform.id}:${normalize(searchTitle)}`;

  let payload = queryCache.get(cacheKey);
  if (!payload) {
    payload = await fetchGamePayload(searchTitle, platform.id, override);
    queryCache.set(cacheKey, payload);
    apiLookups += 1;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  const allPlatformResults = (payload?.data?.games ?? []).filter(
    (candidate) => Number(candidate?.platform) === Number(platform.id),
  );
  const palResults = allPlatformResults.filter(
    (candidate) => Number(candidate?.region_id) === Number(europeRegion.id),
  );

  const ranked = rankCandidates(
    payload,
    searchTitle,
    game,
    platform.id,
    europeRegion.id,
    countriesById,
    override,
  );

  const best = ranked[0];
  const runnerUp = ranked[1];

  if (!palResults.length) {
    missing.push({
      ...game,
      reason: "no-pal-game",
      searchTitle,
      platformId: platform.id,
      candidates: allPlatformResults.slice(0, 4).map((candidate) => ({
        id: candidate.id,
        title: candidate.game_title,
        regionId: candidate.region_id ?? null,
      })),
    });
    continue;
  }

  if (!best || best.nameScore < 900) {
    missing.push({
      ...game,
      reason: "no-confident-title-match",
      searchTitle,
      platformId: platform.id,
      candidates: ranked.slice(0, 4).map((entry) => candidateSummary(entry, countriesById)),
    });
    continue;
  }

  if (
    !override?.tgdbGameId &&
    runnerUp &&
    !sameIdentity(best, runnerUp) &&
    best.score - runnerUp.score < 35
  ) {
    missing.push({
      ...game,
      reason: "ambiguous-match",
      searchTitle,
      platformId: platform.id,
      candidates: ranked.slice(0, 4).map((entry) => candidateSummary(entry, countriesById)),
    });
    continue;
  }

  if (!best.front) {
    missing.push({
      ...game,
      reason: "no-front-boxart",
      searchTitle,
      platformId: platform.id,
      candidate: candidateSummary(best, countriesById),
    });
    continue;
  }

  const imageUrl = remoteImageUrl(payload, best.front);
  if (!imageUrl) {
    missing.push({ ...game, reason: "invalid-boxart-url", searchTitle, tgdbGameId: best.game.id });
    continue;
  }

  const ext = extensionFromFilename(best.front.filename);
  const relativeFile = `/covers/${game.collectionId}${ext}`;
  const destination = path.join(ROOT, "public", relativeFile.replace(/^\//, ""));

  for (const oldExt of [".png", ".jpg", ".jpeg", ".webp"]) {
    if (oldExt !== ext) await fs.rm(path.join(COVERS_DIR, `${game.collectionId}${oldExt}`), { force: true });
  }

  const alreadyDownloaded = downloadedUrlToPath.get(imageUrl);
  if (alreadyDownloaded) {
    await fs.copyFile(alreadyDownloaded, destination);
  } else {
    await download(imageUrl, destination);
    downloadedUrlToPath.set(imageUrl, destination);
  }

  manifest.entries[game.collectionId] = {
    file: relativeFile,
    source: "thegamesdb",
    tgdbGameId: Number(best.game.id),
    tgdbTitle: best.game.game_title,
    matchedName: best.matchedName,
    platformId: Number(platform.id),
    platformName: platform.name,
    regionId: Number(best.game.region_id),
    regionName: String(europeRegion.name ?? "Europe"),
    countryId: Number(best.game.country_id ?? 0),
    countryName: countryName(countriesById, best.game.country_id),
    imageId: Number(best.front.id ?? 0),
    sourceImage: best.front.filename,
    matchScore: best.score,
    nameScore: best.nameScore,
    fingerprint: fp,
  };
  matched += 1;

  if ((index + 1) % 25 === 0) {
    console.log(`Processed ${index + 1}/${games.length}...`);
  }
}

manifest.matched = matched;
manifest.missing = missing.length;
manifest.reused = reusedCount;
manifest.apiLookups = apiLookups;
manifest.remainingMonthlyAllowance = lastAllowance;

const referencedFiles = new Set(Object.values(manifest.entries).map((entry) => path.basename(entry.file)));
for (const file of await fs.readdir(COVERS_DIR)) {
  if (file === "manifest.json") continue;
  if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
  if (!referencedFiles.has(file)) await fs.rm(path.join(COVERS_DIR, file), { force: true });
}

const missingOutput = missing.map((entry) => {
  const game = games.find((candidate) => candidate.collectionId === entry.collectionId) ?? entry;
  const override = overrides[game.collectionId] ?? null;
  return { ...entry, inputKey: inputKey(game, override) };
});

const sortedEntries = Object.fromEntries(
  Object.entries(manifest.entries).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
);
manifest.entries = sortedEntries;

const artworkMap = Object.fromEntries(
  Object.entries(sortedEntries).map(([id, entry]) => [id, entry.file]),
);

await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");
const tgdbMissingText = JSON.stringify({
    generatedAt: manifest.generatedAt,
    source: "thegamesdb",
    regionPolicy: manifest.regionPolicy,
    totalOwnedGames: games.length,
    matched,
    missing: missingOutput.length,
    entries: missingOutput,
  }, null, 2) + "\n";

await fs.writeFile(TGDB_MISSING_FILE, tgdbMissingText);
await fs.writeFile(FINAL_MISSING_FILE, tgdbMissingText);
await fs.writeFile(
  REPORT_FILE,
  JSON.stringify({
    generatedAt: manifest.generatedAt,
    source: "thegamesdb",
    region: manifest.region,
    totalOwnedGames: games.length,
    matched,
    missing: missing.length,
    reused: reusedCount,
    apiLookups,
    remainingMonthlyAllowance: lastAllowance,
    platformMapping: Object.fromEntries(
      [...platformMap.entries()].map(([local, remote]) => [
        local,
        remote ? { id: Number(remote.id), name: remote.name, alias: remote.alias } : null,
      ]),
    ),
  }, null, 2) + "\n",
);
await fs.writeFile(
  GENERATED_MODULE,
  `// Generated by the artwork importer. Do not edit by hand.\nexport const GAME_ARTWORK: Record<string, string> = ${JSON.stringify(artworkMap, null, 2)};\n`,
);

console.log("");
console.log(`Owned games: ${games.length}`);
console.log(`Local PAL covers from TheGamesDB: ${matched}`);
console.log(`Reused validated TGDB covers: ${reusedCount}`);
console.log(`API lookups: ${apiLookups}`);
console.log(`Missing/review: ${missing.length}`);
console.log(`Allowance remaining: ${lastAllowance ?? "unknown"}`);
