import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MISSING_FILE = path.join(ROOT, "data", "artwork-missing.json");
const GAMES_FILE = path.join(ROOT, "data", "artwork-games.json");
const MANIFEST_FILE = path.join(ROOT, "public", "covers", "manifest.json");
const REPORT_FILE = path.join(ROOT, "data", "artwork-libretro-fallback-report.json");
const GENERATED_MODULE = path.join(ROOT, "src", "data", "game-artwork.ts");
const COVERS_DIR = path.join(ROOT, "public", "covers");

const REPO_BY_PLATFORM = {
  NES: "Nintendo_-_Nintendo_Entertainment_System",
  SNES: "Nintendo_-_Super_Nintendo_Entertainment_System",
  "Nintendo 64": "Nintendo_-_Nintendo_64",
  "Game Boy": "Nintendo_-_Game_Boy",
  "Game Boy Color": "Nintendo_-_Game_Boy_Color",
  "GameBoy Advance": "Nintendo_-_Game_Boy_Advance",
  "Nintendo DS": "Nintendo_-_Nintendo_DS",
  "Nintendo 3DS": "Nintendo_-_Nintendo_3DS",
  GameCube: "Nintendo_-_GameCube",
  "Nintendo Wii": "Nintendo_-_Wii",
  "Nintendo Wii U": "Nintendo_-_Wii_U",
  Playstation: "Sony_-_PlayStation",
  "Playstation 2": "Sony_-_PlayStation_2",
  "Playstation 3": "Sony_-_PlayStation_3",
  PSP: "Sony_-_PlayStation_Portable",
};

function ascii(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeTitle(value) {
  return ascii(value)
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/\bclassic nes series\b/g, " ")
    .replace(/\bnes classics\b/g, " ")
    .replace(/\bversion\b/g, " ")
    .replace(/\bthe\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromFilename(filePath) {
  return path.posix
    .basename(filePath)
    .replace(/\.png$/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/^(.*?),\s*The$/i, "The $1")
    .replace(/^(.+?),\s*A$/i, "A $1")
    .replace(/\s+/g, " ")
    .trim();
}

function isStrictPalEurope(filePath) {
  const base = path.posix.basename(filePath);
  const groups = [...base.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].toLowerCase());
  const hasEurope = groups.some((g) => g === "europe" || g.startsWith("europe,") || g.startsWith("europe "));
  const hasNonPal = groups.some((g) =>
    /(^|,|\s)(usa|japan|korea|asia|china|taiwan)(,|\s|$)/i.test(g),
  );
  return hasEurope && !hasNonPal;
}

function editionCompatible(game, filePath) {
  const text = ascii(filePath);
  const edition = ascii(game.edition);
  const special = [
    "platinum",
    "greatest hits",
    "player's choice",
    "players choice",
    "essentials",
    "not for resale",
    "bundle",
    "demo",
  ];
  const specialsInFile = special.filter((term) => text.includes(term));
  if (!specialsInFile.length) return true;
  if (!edition || edition === "standard") return false;
  return specialsInFile.some((term) => edition.includes(term));
}

async function githubJson(apiPath) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "MarioRetroCollection-libretro-fallback",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(`https://api.github.com${apiPath}`, { headers });
    if (response.ok) return response.json();
    if (![500, 502, 503, 504].includes(response.status) || attempt === 4) {
      throw new Error(`GitHub API ${response.status}: ${apiPath}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
  }
}

async function loadBoxartTree(repoName) {
  const root = await githubJson(`/repos/libretro-thumbnails/${repoName}/git/trees/master`);
  const boxartRoot = (root.tree ?? []).find((entry) => entry.type === "tree" && entry.path === "Named_Boxarts");
  if (!boxartRoot?.sha) return [];
  const payload = await githubJson(`/repos/libretro-thumbnails/${repoName}/git/trees/${boxartRoot.sha}?recursive=1`);
  if (payload.truncated) throw new Error(`Truncated Named_Boxarts tree: ${repoName}`);
  return (payload.tree ?? [])
    .filter((entry) => entry.type === "blob" && entry.path?.endsWith(".png"))
    .map((entry) => `Named_Boxarts/${entry.path}`);
}

function rawUrl(repoName, filePath) {
  const encoded = filePath.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/libretro-thumbnails/${repoName}/master/${encoded}`;
}

async function download(url, destination) {
  const response = await fetch(url, { headers: { "User-Agent": "MarioRetroCollection-libretro-fallback" } });
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

await fs.mkdir(COVERS_DIR, { recursive: true });
const missingFile = JSON.parse(await fs.readFile(MISSING_FILE, "utf8"));
const games = JSON.parse(await fs.readFile(GAMES_FILE, "utf8"));
const manifest = JSON.parse(await fs.readFile(MANIFEST_FILE, "utf8"));
const byId = new Map(games.map((game) => [game.collectionId, game]));

const targets = (missingFile.entries ?? [])
  .map((entry) => byId.get(entry.collectionId))
  .filter(Boolean)
  .filter((game) => REPO_BY_PLATFORM[game.platform]);

const repos = [...new Set(targets.map((game) => REPO_BY_PLATFORM[game.platform]))];
const trees = new Map();

for (const repoName of repos) {
  const files = await loadBoxartTree(repoName);
  trees.set(repoName, files);
  console.log(`${repoName}: ${files.length} boxarts`);
}

const imported = [];
const unresolvedIds = new Set((missingFile.entries ?? []).map((entry) => entry.collectionId));

for (const game of targets) {
  const repoName = REPO_BY_PLATFORM[game.platform];
  const requested = normalizeTitle(game.title);

  const candidates = (trees.get(repoName) ?? [])
    .filter(isStrictPalEurope)
    .filter((filePath) => editionCompatible(game, filePath))
    .filter((filePath) => normalizeTitle(titleFromFilename(filePath)) === requested);

  if (candidates.length !== 1) continue;

  const sourcePath = candidates[0];
  const destination = path.join(COVERS_DIR, `${game.collectionId}.png`);
  await download(rawUrl(repoName, sourcePath), destination);

  manifest.entries[game.collectionId] = {
    file: `/covers/${game.collectionId}.png`,
    source: "libretro-thumbnails-strict-pal-fallback",
    sourceRepo: `libretro-thumbnails/${repoName}`,
    sourcePath,
    regionPolicy: "PAL-Europe-only",
    matchType: "exact-normalized-title",
  };
  imported.push({ collectionId: game.collectionId, title: game.title, platform: game.platform, sourcePath });
  unresolvedIds.delete(game.collectionId);
}

const nextMissing = (missingFile.entries ?? []).filter((entry) => unresolvedIds.has(entry.collectionId));
manifest.entries = Object.fromEntries(
  Object.entries(manifest.entries).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
);
manifest.matched = Object.keys(manifest.entries).length;
manifest.missing = games.length - manifest.matched;
manifest.fallbackImported = imported.length;

await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");
await fs.writeFile(
  MISSING_FILE,
  JSON.stringify({
    ...missingFile,
    generatedAt: new Date().toISOString(),
    matched: manifest.matched,
    missing: nextMissing.length,
    entries: nextMissing,
  }, null, 2) + "\n",
);
await fs.writeFile(
  REPORT_FILE,
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: "libretro-thumbnails-strict-pal-fallback",
    attempted: targets.length,
    imported: imported.length,
    remaining: nextMissing.length,
    entries: imported,
  }, null, 2) + "\n",
);

const artworkMap = Object.fromEntries(
  Object.entries(manifest.entries).map(([id, entry]) => [id, entry.file]),
);
await fs.writeFile(
  GENERATED_MODULE,
  `// Generated by the artwork importer. Do not edit by hand.\nexport const GAME_ARTWORK: Record<string, string> = ${JSON.stringify(artworkMap, null, 2)};\n`,
);

console.log(`Strict PAL fallback imported: ${imported.length}`);
console.log(`Remaining missing: ${nextMissing.length}`);

// fallback-import-version: 1
