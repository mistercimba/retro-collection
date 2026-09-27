import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GAMES_FILE = path.join(ROOT, "data", "artwork-games.json");
const COVERS_DIR = path.join(ROOT, "public", "covers");
const MANIFEST_FILE = path.join(COVERS_DIR, "manifest.json");
const MISSING_FILE = path.join(ROOT, "data", "artwork-missing.json");
const FORCE = process.argv.includes("--force");

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

const PAL_MARKERS = [
  "europe",
  "europe australia",
  "australia",
  "united kingdom",
  "uk",
  "england",
  "france",
  "germany",
  "spain",
  "italy",
  "portugal",
  "netherlands",
  "belgium",
  "sweden",
  "norway",
  "denmark",
  "finland",
  "austria",
  "switzerland",
  "ireland",
];

const HARD_NON_PAL_MARKERS = [
  "japan",
  "korea",
  "china",
  "taiwan",
  "asia",
];

const STOP_WORDS = new Set(["the", "a", "an", "and", "of"]);

function ascii(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalize(value) {
  return ascii(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCoreFromFilename(filePath) {
  const filename = path.posix.basename(filePath).replace(/\.png$/i, "");
  return filename.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function significantTokens(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function diceCoefficient(a, b) {
  const bigrams = (value) => {
    const compact = normalize(value).replace(/\s/g, "");
    const out = new Set();
    for (let index = 0; index < compact.length - 1; index += 1) out.add(compact.slice(index, index + 2));
    return out;
  };
  const left = bigrams(a);
  const right = bigrams(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const item of left) if (right.has(item)) overlap += 1;
  return (2 * overlap) / (left.size + right.size);
}

function tokenScore(a, b) {
  const left = new Set(significantTokens(a));
  const right = new Set(significantTokens(b));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap / Math.max(left.size, right.size);
}

function hasPalMarker(filePath) {
  const text = normalize(filePath);
  return PAL_MARKERS.some((marker) => text.includes(normalize(marker)));
}

function isHardNonPalOnly(filePath) {
  const text = normalize(filePath);
  const hasPal = hasPalMarker(filePath);
  return !hasPal && HARD_NON_PAL_MARKERS.some((marker) => text.includes(normalize(marker)));
}

function preferredCountryHints(game) {
  const hints = [];
  const code = ascii(game.productCode);
  if (/\bukv\b/.test(code)) hints.push("united kingdom", "uk", "europe");
  if (/\bfra\b/.test(code)) hints.push("france", "europe");
  if (/\bnoe\b/.test(code)) hints.push("germany", "europe");
  if (/\bita\b/.test(code)) hints.push("italy", "europe");
  if (/\bspa\b|\besp\b/.test(code)) hints.push("spain", "europe");
  if (/\baus\b/.test(code)) hints.push("australia", "europe");
  return hints;
}

function candidateScore(filePath, game) {
  if (!filePath.startsWith("Named_Boxarts/") || !filePath.endsWith(".png")) return -Infinity;
  if (!hasPalMarker(filePath) || isHardNonPalOnly(filePath)) return -Infinity;

  const base = titleCoreFromFilename(filePath);
  const requested = game.title;
  const baseNorm = normalize(base);
  const requestedNorm = normalize(requested);

  let score = 0;
  if (baseNorm === requestedNorm) score += 1000;
  else {
    const tokens = tokenScore(base, requested);
    const dice = diceCoefficient(base, requested);
    if (tokens < 0.62 || dice < 0.55) return -Infinity;
    score += Math.round(tokens * 500 + dice * 350);
    if (baseNorm.includes(requestedNorm) || requestedNorm.includes(baseNorm)) score += 120;
  }

  const normalizedPath = normalize(filePath);
  if (normalizedPath.includes("europe")) score += 160;
  if (normalizedPath.includes("europe australia")) score += 10;

  for (const hint of preferredCountryHints(game)) {
    if (normalizedPath.includes(normalize(hint))) score += 35;
  }

  const edition = normalize(game.edition);
  if (edition && edition !== "standard" && normalizedPath.includes(edition)) score += 35;

  if (normalizedPath.includes("proto") || normalizedPath.includes("beta") || normalizedPath.includes("demo")) score -= 300;
  if (normalizedPath.includes("aftermarket") || normalizedPath.includes("unl")) score -= 200;

  return score;
}

async function githubJson(apiPath) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "MarioRetroCollection-artwork-importer",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  let lastStatus = 0;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(`https://api.github.com${apiPath}`, { headers });
    lastStatus = response.status;
    if (response.ok) return response.json();
    if (![500, 502, 503, 504].includes(response.status) || attempt === 4) {
      throw new Error(`GitHub API ${response.status}: ${apiPath}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
  throw new Error(`GitHub API ${lastStatus}: ${apiPath}`);
}

async function loadBoxartTree(repoName) {
  // Query only the Named_Boxarts subtree. Asking GitHub for the recursive
  // repository root of very large systems (PS1/PS2) can return 500/truncated trees.
  const root = await githubJson(`/repos/libretro-thumbnails/${repoName}/git/trees/master`);
  const boxartRoot = (root.tree ?? []).find((entry) => entry.type === "tree" && entry.path === "Named_Boxarts");
  if (!boxartRoot?.sha) throw new Error(`Named_Boxarts tree not found for ${repoName}`);

  const payload = await githubJson(`/repos/libretro-thumbnails/${repoName}/git/trees/${boxartRoot.sha}?recursive=1`);
  if (payload.truncated) {
    throw new Error(`Named_Boxarts tree for ${repoName} was truncated; refusing to guess artwork.`);
  }

  return (payload.tree ?? [])
    .filter((entry) => entry.type === "blob" && entry.path?.endsWith(".png"))
    .map((entry) => `Named_Boxarts/${entry.path}`);
}

function rawUrl(repoName, filePath) {
  const encoded = filePath.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/libretro-thumbnails/${repoName}/master/${encoded}`;
}

async function download(url, destination) {
  const response = await fetch(url, {
    headers: { "User-Agent": "MarioRetroCollection-artwork-importer" },
  });
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destination, buffer);
}

await fs.mkdir(COVERS_DIR, { recursive: true });
const games = JSON.parse(await fs.readFile(GAMES_FILE, "utf8"));
const supportedGames = games.filter((game) => REPO_BY_PLATFORM[game.platform]);
const unsupportedGames = games.filter((game) => !REPO_BY_PLATFORM[game.platform]);

const repoNames = [...new Set(supportedGames.map((game) => REPO_BY_PLATFORM[game.platform]))];
const trees = new Map();

console.log(`Loading box-art indexes for ${repoNames.length} systems...`);
for (const repoName of repoNames) {
  const tree = await loadBoxartTree(repoName);
  trees.set(repoName, tree);
  console.log(`  ${repoName}: ${tree.length} box-art files`);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  source: "libretro-thumbnails",
  sourceUrl: "https://github.com/libretro-thumbnails",
  totalOwnedGames: games.length,
  entries: {},
};

const missing = [];
let matched = 0;
let reused = 0;

for (const [index, game] of games.entries()) {
  const repoName = REPO_BY_PLATFORM[game.platform];
  if (!repoName) {
    missing.push({ ...game, reason: "unsupported-platform" });
    continue;
  }

  const candidates = (trees.get(repoName) ?? [])
    .map((filePath) => ({ filePath, score: candidateScore(filePath, game) }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  const runnerUp = candidates[1];

  // Be conservative. A wrong regional cover is worse than a placeholder.
  if (!best || best.score < 620 || (runnerUp && best.score - runnerUp.score < 18 && best.score < 950)) {
    missing.push({
      ...game,
      reason: best ? "ambiguous-match" : "no-pal-match",
      bestCandidate: best?.filePath ?? null,
      bestScore: best?.score ?? null,
    });
    continue;
  }

  const destination = path.join(COVERS_DIR, `${game.collectionId}.png`);
  let exists = false;
  try {
    await fs.access(destination);
    exists = true;
  } catch {}

  if (!exists || FORCE) {
    await download(rawUrl(repoName, best.filePath), destination);
  } else {
    reused += 1;
  }

  manifest.entries[game.collectionId] = {
    file: `/covers/${game.collectionId}.png`,
    region: "PAL",
    type: "box-front",
    sourceRepo: `libretro-thumbnails/${repoName}`,
    sourcePath: best.filePath,
    matchScore: best.score,
  };
  matched += 1;

  if ((index + 1) % 25 === 0) {
    console.log(`Processed ${index + 1}/${games.length}...`);
  }
}

manifest.matched = matched;
manifest.missing = missing.length;
manifest.unsupported = unsupportedGames.length;

await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");
await fs.writeFile(
  MISSING_FILE,
  JSON.stringify(
    {
      generatedAt: manifest.generatedAt,
      totalOwnedGames: games.length,
      matched,
      missing: missing.length,
      entries: missing,
    },
    null,
    2,
  ) + "\n",
);

console.log("");
console.log(`Owned games: ${games.length}`);
console.log(`Local PAL covers: ${matched}`);
console.log(`Already present: ${reused}`);
console.log(`Missing/review: ${missing.length}`);
