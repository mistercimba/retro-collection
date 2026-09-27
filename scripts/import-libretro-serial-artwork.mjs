import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GAMES_FILE = path.join(ROOT, "data", "artwork-games.json");
const FINAL_MISSING_FILE = path.join(ROOT, "data", "artwork-missing.json");
const MANIFEST_FILE = path.join(ROOT, "public", "covers", "manifest.json");
const REPORT_FILE = path.join(ROOT, "data", "artwork-libretro-serial-report.json");
const GENERATED_MODULE = path.join(ROOT, "src", "data", "game-artwork.ts");
const COVERS_DIR = path.join(ROOT, "public", "covers");

const SOURCES = {
  Playstation: {
    datPath: "metadat/redump/Sony - PlayStation.dat",
    thumbsRepo: "libretro-thumbnails/Sony_-_PlayStation",
    serialRegex: /\b(?:SLES|SCES|SLED|SCED)[-_ ]?\d{5}(?:\/[A-Z0-9]+)?\b/gi,
  },
  "Playstation 2": {
    datPath: "metadat/redump/Sony - PlayStation 2.dat",
    thumbsRepo: "libretro-thumbnails/Sony_-_PlayStation_2",
    serialRegex: /\b(?:SLES|SCES|SLED|SCED)[-_ ]?\d{5}(?:\/[A-Z0-9]+)?\b/gi,
  },
  PSP: {
    datPath: "metadat/redump/Sony - PlayStation Portable.dat",
    thumbsRepo: "libretro-thumbnails/Sony_-_PlayStation_Portable",
    serialRegex: /\b(?:ULES|UCES)[-_ ]?\d{5}(?:\/[A-Z0-9]+)?\b/gi,
  },
};

const PAL_FILENAME_MARKERS = [
  "europe",
  "australia",
  "france",
  "germany",
  "spain",
  "italy",
  "united kingdom",
  "netherlands",
  "portugal",
];

const NON_RETAIL_TERMS = ["beta", "demo", "prototype", "proto", "promo"];
const EDITION_TERMS = ["platinum", "greatest hits", "essentials", "limited edition", "special edition"];

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

function canonicalBase(value) {
  return normalize(
    String(value ?? "")
      .replace(/\s*\((?:Europe|France|Germany|Spain|Italy|United Kingdom|Australia|USA|Japan|Asia|Korea)[^)]*\).*$/i, "")
      .replace(/\s*\((?:En|Fr|De|Es|It|Nl|Pt|Sv|Da|No|Fi)(?:,[A-Za-z]{2})*\).*$/i, "")
      .replace(/\s*\(v\d[^)]*\).*$/i, "")
      .replace(/\s*\((?:Disc|Disk)\s*\d[^)]*\).*$/i, ""),
  );
}

function compact(value) {
  return canonicalBase(value)
    .replace(/\b(the|a|an|version)\b/g, " ")
    .replace(/\bspider man\b/g, "spiderman")
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

function tokenMetrics(a, b) {
  const left = new Set(compact(a).split(" ").filter((token) => token.length > 1));
  const right = new Set(compact(b).split(" ").filter((token) => token.length > 1));
  if (!left.size || !right.size) return { coverage: 0, precision: 0 };
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return { coverage: overlap / left.size, precision: overlap / right.size };
}

function titleScore(requested, candidate) {
  const a = compact(requested);
  const b = compact(candidate);
  if (!a || !b) return -Infinity;
  if (a === b) return 1000;
  if (a.replace(/\s/g, "") === b.replace(/\s/g, "")) return 990;

  const { coverage, precision } = tokenMetrics(requested, candidate);
  const dice = diceCoefficient(requested, candidate);
  if (coverage < 0.72 || precision < 0.62 || dice < 0.55) return -Infinity;
  return Math.round(coverage * 520 + precision * 220 + dice * 260);
}

function normalizeSerial(value) {
  const upper = String(value ?? "").toUpperCase().replace(/_/g, "-").replace(/\s+/g, "");
  const match = upper.match(/^([A-Z]{4})-?(\d{5})(\/[A-Z0-9]+)?$/);
  if (!match) return upper;
  return `${match[1]}-${match[2]}${match[3] ?? ""}`;
}

function extractSerials(game, config) {
  const text = String(game.productCode ?? "");
  const serials = [];
  config.serialRegex.lastIndex = 0;
  for (const match of text.matchAll(config.serialRegex)) {
    const serial = normalizeSerial(match[0]);
    if (serial && !serials.includes(serial)) serials.push(serial);
    const base = serial.replace(/\/[A-Z0-9]+$/, "");
    if (base && !serials.includes(base)) serials.push(base);
  }
  return serials;
}

function readJson(filePath, fallback) {
  return fs.readFile(filePath, "utf8").then(JSON.parse).catch(() => fallback);
}

async function githubRaw(repo, filePath) {
  const encoded = filePath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://raw.githubusercontent.com/${repo}/master/${encoded}`, {
    headers: { "User-Agent": "MarioRetroCollection/1.0" },
  });
  if (!response.ok) throw new Error(`GitHub raw returned ${response.status}: ${repo}/${filePath}`);
  return response.text();
}

async function githubJson(url) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "MarioRetroCollection/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}: ${url}`);
  return response.json();
}

async function loadThumbnailTree(repo) {
  const root = await githubJson(`https://api.github.com/repos/${repo}/git/trees/master`);
  const boxart = (root.tree ?? []).find((entry) => entry.type === "tree" && entry.path === "Named_Boxarts");
  if (!boxart?.sha) throw new Error(`Named_Boxarts not found: ${repo}`);

  const tree = await githubJson(`https://api.github.com/repos/${repo}/git/trees/${boxart.sha}?recursive=1`);
  if (tree.truncated) throw new Error(`Named_Boxarts tree truncated: ${repo}`);

  return (tree.tree ?? [])
    .filter((entry) => entry.type === "blob" && entry.path?.toLowerCase().endsWith(".png"))
    .map((entry) => `Named_Boxarts/${entry.path}`);
}

function blockAround(content, serialIndex) {
  const start = content.lastIndexOf("\ngame (", serialIndex);
  const next = content.indexOf("\ngame (", serialIndex + 1);
  if (start < 0) return null;
  return content.slice(start + 1, next < 0 ? content.length : next);
}

function datCandidatesForSerial(content, serial) {
  const normalizedContent = content.toUpperCase();
  const variants = [...new Set([
    serial,
    serial.replace(/\/[A-Z0-9]+$/, ""),
  ])];

  const candidates = [];
  for (const variant of variants) {
    let position = 0;
    while (position < normalizedContent.length) {
      const index = normalizedContent.indexOf(`"${variant.toUpperCase()}"`, position);
      if (index < 0) break;
      const block = blockAround(content, index);
      position = index + variant.length + 2;
      if (!block) continue;

      const name = block.match(/\bname\s+"([^"]+)"/)?.[1];
      const region = block.match(/\bregion\s+"([^"]+)"/)?.[1] ?? "";
      if (!name || !/Europe/i.test(region)) continue;

      const key = `${name}::${region}`;
      if (!candidates.some((candidate) => candidate.key === key)) {
        candidates.push({ key, name, region, serial: variant });
      }
    }
  }
  return candidates;
}

function editionPreference(game, candidateName) {
  const local = normalize(game.edition);
  const remote = normalize(candidateName);
  let score = 0;

  for (const term of NON_RETAIL_TERMS) {
    if (remote.includes(term) && !local.includes(term)) score -= 350;
    if (remote.includes(term) && local.includes(term)) score += 100;
  }

  for (const term of EDITION_TERMS) {
    if (local.includes(term) && remote.includes(term)) score += 80;
    else if (local.includes(term) && !remote.includes(term)) score -= 20;
    else if (!local.includes(term) && remote.includes(term)) score -= 60;
  }

  return score;
}

function chooseDatCandidate(content, serials, game) {
  const all = [];
  for (const serial of serials) {
    for (const candidate of datCandidatesForSerial(content, serial)) {
      const score = titleScore(game.title, candidate.name) + editionPreference(game, candidate.name);
      if (Number.isFinite(score)) all.push({ ...candidate, score });
    }
  }
  all.sort((a, b) => b.score - a.score);
  return all[0]?.score >= 600 ? all[0] : null;
}

function filenameBase(filePath) {
  return path.posix.basename(filePath).replace(/\.png$/i, "");
}

function isPalThumbnail(filePath) {
  const value = normalize(filePath);
  return PAL_FILENAME_MARKERS.some((marker) => value.includes(normalize(marker)));
}

function countryPreference(game, filePath) {
  const source = String(game.productCode ?? "").toUpperCase();
  const value = normalize(filePath);
  if (/UKV/.test(source) && value.includes("united kingdom")) return 80;
  if (/FRA/.test(source) && value.includes("france")) return 80;
  if (/ESP/.test(source) && value.includes("spain")) return 80;
  if (/ITA/.test(source) && value.includes("italy")) return 80;
  if (/GER|NOE/.test(source) && value.includes("germany")) return 80;
  if (/POR|PORT/.test(source) && value.includes("portugal")) return 80;
  if (value.includes("europe")) return 45;
  if (value.includes("australia")) return 25;
  return 0;
}

function chooseThumbnail(tree, canonicalName, game) {
  const canonical = canonicalBase(canonicalName);
  const candidates = tree
    .filter(isPalThumbnail)
    .map((filePath) => {
      const base = filenameBase(filePath);
      const score = titleScore(canonical, base);
      if (!Number.isFinite(score)) return null;

      let total = score + countryPreference(game, filePath);
      const remote = normalize(base);
      const localEdition = normalize(game.edition);
      for (const term of NON_RETAIL_TERMS) {
        if (remote.includes(term) && !localEdition.includes(term)) total -= 350;
      }
      for (const term of EDITION_TERMS) {
        if (localEdition.includes(term) && remote.includes(term)) total += 60;
        else if (!localEdition.includes(term) && remote.includes(term)) total -= 50;
      }
      return { filePath, score: total, titleScore: score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  const runnerUp = candidates[1];
  if (!best || best.titleScore < 700) return null;

  // If two genuinely different titles are almost tied, do not guess.
  if (
    runnerUp &&
    canonicalBase(filenameBase(best.filePath)) !== canonicalBase(filenameBase(runnerUp.filePath)) &&
    best.score - runnerUp.score < 20 &&
    best.titleScore < 950
  ) {
    return null;
  }

  return best;
}

async function download(repo, filePath, destination) {
  const encoded = filePath.split("/").map(encodeURIComponent).join("/");
  const url = `https://raw.githubusercontent.com/${repo}/master/${encoded}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "MarioRetroCollection/1.0" },
  });
  if (!response.ok) throw new Error(`Thumbnail download returned ${response.status}: ${url}`);
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
  return url;
}

await fs.mkdir(COVERS_DIR, { recursive: true });

const [games, manifest, finalMissing] = await Promise.all([
  readJson(GAMES_FILE, []),
  readJson(MANIFEST_FILE, { entries: {} }),
  readJson(FINAL_MISSING_FILE, { entries: [] }),
]);

const datCache = new Map();
const treeCache = new Map();

for (const platform of Object.keys(SOURCES)) {
  if (!games.some((game) => game.platform === platform)) continue;
  const source = SOURCES[platform];
  datCache.set(platform, await githubRaw("libretro/libretro-database", source.datPath));
  treeCache.set(platform, await loadThumbnailTree(source.thumbsRepo));
  console.log(`${platform}: DAT + ${treeCache.get(platform).length} boxart files loaded`);
}

const resolved = [];
const unresolvedSerials = [];
let replaced = 0;
let added = 0;

for (const game of games) {
  const source = SOURCES[game.platform];
  if (!source) continue;

  const serials = extractSerials(game, source);
  if (!serials.length) continue;

  const dat = datCache.get(game.platform);
  const tree = treeCache.get(game.platform) ?? [];
  const datMatch = chooseDatCandidate(dat, serials, game);

  if (!datMatch) {
    unresolvedSerials.push({
      collectionId: game.collectionId,
      platform: game.platform,
      title: game.title,
      serials,
      reason: "serial-not-mapped-confidently",
    });
    continue;
  }

  const thumbnail = chooseThumbnail(tree, datMatch.name, game);
  if (!thumbnail) {
    unresolvedSerials.push({
      collectionId: game.collectionId,
      platform: game.platform,
      title: game.title,
      serials,
      redumpName: datMatch.name,
      reason: "no-confident-pal-thumbnail",
    });
    continue;
  }

  const previous = manifest.entries?.[game.collectionId] ?? null;
  const relativeFile = `/covers/${game.collectionId}.png`;
  const destination = path.join(ROOT, "public", relativeFile.replace(/^\//, ""));

  for (const oldExt of [".jpg", ".jpeg", ".webp"]) {
    await fs.rm(path.join(COVERS_DIR, `${game.collectionId}${oldExt}`), { force: true });
  }

  const sourceUrl = await download(source.thumbsRepo, thumbnail.filePath, destination);

  manifest.entries ??= {};
  manifest.entries[game.collectionId] = {
    file: relativeFile,
    source: "libretro-redump-serial",
    redumpSerial: datMatch.serial,
    redumpName: datMatch.name,
    redumpRegion: datMatch.region,
    sourceRepo: source.thumbsRepo,
    sourcePath: thumbnail.filePath,
    sourceImage: sourceUrl,
    matchedBy: "physical-serial-redump",
    matchScore: thumbnail.score,
  };

  if (previous) replaced += 1;
  else added += 1;

  resolved.push({
    collectionId: game.collectionId,
    platform: game.platform,
    title: game.title,
    serial: datMatch.serial,
    redumpName: datMatch.name,
    thumbnail: thumbnail.filePath,
    replacedSource: previous?.source ?? null,
  });

  if (resolved.length % 20 === 0) {
    console.log(`Resolved ${resolved.length} serial-matched Sony covers...`);
  }
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
manifest.missing = games.length - manifest.matched;
manifest.generatedAt = new Date().toISOString();

const currentMissingById = new Map((finalMissing.entries ?? []).map((entry) => [entry.collectionId, entry]));
const stillMissing = games
  .filter((game) => !sortedEntries[game.collectionId])
  .map((game) => currentMissingById.get(game.collectionId) ?? {
    ...game,
    reason: "no-local-artwork-after-fallbacks",
  });

const artworkMap = Object.fromEntries(
  Object.entries(sortedEntries).map(([id, entry]) => [id, entry.file]),
);

await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");
await fs.writeFile(
  FINAL_MISSING_FILE,
  JSON.stringify({
    generatedAt: manifest.generatedAt,
    source: "local-artwork",
    sourcesTried: ["thegamesdb", "gametdb", "libretro-redump-serial"],
    regionPolicy: "PAL-Europe",
    totalOwnedGames: games.length,
    matched: manifest.matched,
    missing: stillMissing.length,
    entries: stillMissing,
  }, null, 2) + "\n",
);
await fs.writeFile(
  REPORT_FILE,
  JSON.stringify({
    generatedAt: manifest.generatedAt,
    source: "libretro-redump-serial",
    resolved: resolved.length,
    added,
    replaced,
    unresolvedSerials: unresolvedSerials.length,
    entries: resolved,
    unresolvedEntries: unresolvedSerials,
  }, null, 2) + "\n",
);
await fs.writeFile(
  GENERATED_MODULE,
  `// Generated by the artwork importer. Do not edit by hand.\nexport const GAME_ARTWORK: Record<string, string> = ${JSON.stringify(artworkMap, null, 2)};\n`,
);

console.log("");
console.log(`Serial-matched Sony covers resolved: ${resolved.length}`);
console.log(`Added: ${added}; replaced weaker source: ${replaced}`);
console.log(`Total local artwork: ${manifest.matched}/${games.length}`);
console.log(`Still missing: ${stillMissing.length}`);

// pipeline-version: 1
