import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MISSING_FILE = path.join(ROOT, "data", "artwork-missing.json");
const GAMES_FILE = path.join(ROOT, "data", "artwork-games.json");
const ARCHIVE_FILE = path.join(ROOT, "data", "artwork-libretro-manifest.json");
const PRIMARY_MANIFEST = path.join(ROOT, "public", "covers", "manifest.json");
const FALLBACK_MANIFEST = path.join(ROOT, "public", "covers", "libretro-fallback-manifest.json");
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

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bversion\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonical(value) {
  return normalize(value)
    .replace(/^(the|a|an)\s+/, "")
    .replace(/\bclassic nes series\b/g, "")
    .replace(/\bnes classics\b/g, "")
    .replace(/\bspider man\b/g, "spiderman")
    .replace(/\bwarioware\b/g, "wario ware")
    .replace(/\s+/g, " ")
    .trim();
}

function fileCore(sourcePath) {
  return path.posix
    .basename(sourcePath ?? "")
    .replace(/\.png$/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStrictPal(sourcePath) {
  const value = normalize(sourcePath);
  return /\b(europe|portugal|united kingdom|uk|france|germany|spain|italy|australia)\b/.test(value);
}

function hasUnsafeVariant(sourcePath, edition) {
  const value = normalize(sourcePath);
  if (/\b(virtual console|demo|beta|proto|prototype|aftermarket|unl|not for resale)\b/.test(value)) return true;

  const editionNorm = normalize(edition);
  const special = ["platinum", "greatest hits", "player s choice", "players choice", "essentials", "bundle"];
  const present = special.filter((term) => value.includes(term));
  if (!present.length) return false;
  if (!editionNorm || editionNorm === "standard") return true;
  return !present.some((term) => editionNorm.includes(term) || term.includes(editionNorm));
}

function rawUrl(repoName, sourcePath) {
  const encoded = sourcePath.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/libretro-thumbnails/${repoName}/master/${encoded}`;
}

async function download(url, destination) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": "MarioRetroCollection/1.0" } });
    if (response.ok) {
      await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (attempt === 4) throw new Error(`Download failed ${response.status}: ${url}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 800));
  }
}

await fs.mkdir(COVERS_DIR, { recursive: true });

const [missingData, games, archive, primary] = await Promise.all([
  fs.readFile(MISSING_FILE, "utf8").then(JSON.parse),
  fs.readFile(GAMES_FILE, "utf8").then(JSON.parse),
  fs.readFile(ARCHIVE_FILE, "utf8").then(JSON.parse),
  fs.readFile(PRIMARY_MANIFEST, "utf8").then(JSON.parse),
]);

const gamesById = new Map(games.map((game) => [game.collectionId, game]));
const currentMissingIds = new Set((missingData.entries ?? []).map((entry) => entry.collectionId));
const entries = {};

for (const collectionId of currentMissingIds) {
  const game = gamesById.get(collectionId);
  const archived = archive.entries?.[collectionId];
  if (!game || !archived?.sourcePath) continue;

  const repoName = REPO_BY_PLATFORM[game.platform];
  if (!repoName) continue;

  const core = fileCore(archived.sourcePath);
  if (canonical(core) !== canonical(game.title)) continue;
  if (!isStrictPal(archived.sourcePath)) continue;
  if (hasUnsafeVariant(archived.sourcePath, game.edition)) continue;

  const destination = path.join(COVERS_DIR, `${collectionId}.png`);
  await download(rawUrl(repoName, archived.sourcePath), destination);

  entries[collectionId] = {
    file: `/covers/${collectionId}.png`,
    source: "libretro-thumbnails",
    policy: "strict-exact-title-pal-fallback",
    sourceRepo: `libretro-thumbnails/${repoName}`,
    sourcePath: archived.sourcePath,
  };
}

const fallbackManifest = {
  generatedAt: new Date().toISOString(),
  source: "libretro-thumbnails",
  policy: "strict-exact-title-pal-fallback",
  matched: Object.keys(entries).length,
  entries,
};

await fs.writeFile(FALLBACK_MANIFEST, JSON.stringify(fallbackManifest, null, 2) + "\n");

const merged = {
  ...Object.fromEntries(Object.entries(primary.entries ?? {}).map(([id, entry]) => [id, entry.file])),
  ...Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id, entry.file])),
};
const sorted = Object.fromEntries(
  Object.entries(merged).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
);

await fs.writeFile(
  GENERATED_MODULE,
  `// Generated by the artwork importers. Do not edit by hand.\nexport const GAME_ARTWORK: Record<string, string> = ${JSON.stringify(sorted, null, 2)};\n`,
);

console.log(`Strict local libretro fallback covers added: ${Object.keys(entries).length}`);
console.log(`Total local artwork mappings after merge: ${Object.keys(sorted).length}`);

// importer-version: 2
