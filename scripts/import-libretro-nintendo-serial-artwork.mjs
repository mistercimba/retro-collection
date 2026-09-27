import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GAMES_FILE = path.join(ROOT, "data", "artwork-games.json");
const FINAL_MISSING_FILE = path.join(ROOT, "data", "artwork-missing.json");
const MANIFEST_FILE = path.join(ROOT, "public", "covers", "manifest.json");
const REPORT_FILE = path.join(ROOT, "data", "artwork-libretro-nintendo-serial-report.json");
const GENERATED_MODULE = path.join(ROOT, "src", "data", "game-artwork.ts");
const COVERS_DIR = path.join(ROOT, "public", "covers");

const SOURCES = {
  "GameBoy Advance": {
    serialDat: "metadat/serial/Nintendo - Game Boy Advance.dat",
    thumbsRepo: "libretro-thumbnails/Nintendo_-_Game_Boy_Advance",
    prefixes: ["AGB"],
  },
  "Game Boy": {
    serialDat: "metadat/serial/Nintendo - Game Boy.dat",
    thumbsRepo: "libretro-thumbnails/Nintendo_-_Game_Boy",
    prefixes: ["DMG"],
  },
  "Game Boy Color": {
    serialDat: "metadat/serial/Nintendo - Game Boy Color.dat",
    thumbsRepo: "libretro-thumbnails/Nintendo_-_Game_Boy_Color",
    prefixes: ["CGB", "DMG"],
  },
  "Nintendo 64": {
    serialDat: "metadat/serial/Nintendo - Nintendo 64.dat",
    thumbsRepo: "libretro-thumbnails/Nintendo_-_Nintendo_64",
    prefixes: ["NUS"],
  },
  NES: {
    serialDat: "metadat/serial/Nintendo - Nintendo Entertainment System.dat",
    thumbsRepo: "libretro-thumbnails/Nintendo_-_Nintendo_Entertainment_System",
    prefixes: ["NES"],
  },
  SNES: {
    serialDat: "metadat/serial/Nintendo - Super Nintendo Entertainment System.dat",
    thumbsRepo: "libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System",
    prefixes: ["SNSP"],
  },
};

const PAL_SUFFIXES = new Set([
  "EUR", "UKV", "FRA", "FRG", "EEC", "GPS", "ESP", "ITA", "NOE", "GER",
  "EUU", "EUT", "EAP", "FAH", "HOL", "SCN", "SWE", "NOR", "DAN", "FIN",
  "AUS", "PORT", "POR",
]);

const PAL_FILENAME_MARKERS = [
  "europe", "france", "germany", "spain", "italy", "united kingdom",
  "australia", "netherlands", "sweden", "norway", "denmark", "finland",
];

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
  return normalize(
    String(value ?? "")
      .replace(/\s*\((?:Europe|France|Germany|Spain|Italy|United Kingdom|Australia|USA|Japan|Asia|Korea)[^)]*\).*$/i, "")
      .replace(/\s*\((?:En|Fr|De|Es|It|Nl|Pt|Sv|Da|No|Fi|Ja)(?:,[A-Za-z]{2})*\).*$/i, "")
      .replace(/\s*\(Rev\s*\d+\).*$/i, ""),
  )
    .replace(/\bversion\b/g, " ")
    .replace(/\bedicion\b/g, " ")
    .replace(/\bedition\b/g, " ")
    .replace(/\bthe\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value) {
  return new Set(
    canonicalTitle(value)
      .split(" ")
      .filter((token) => token.length > 1 && !["and", "of", "for"].includes(token)),
  );
}

function diceCoefficient(a, b) {
  const make = (value) => {
    const text = canonicalTitle(value).replace(/\s/g, "");
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

function titleScore(requested, candidate) {
  const a = canonicalTitle(requested);
  const b = canonicalTitle(candidate);
  if (!a || !b) return -Infinity;
  if (a === b) return 1000;
  if (a.replace(/\s/g, "") === b.replace(/\s/g, "")) return 990;

  const requestedTokens = tokenSet(requested);
  const candidateTokens = tokenSet(candidate);
  let overlap = 0;
  for (const token of requestedTokens) if (candidateTokens.has(token)) overlap += 1;
  const coverage = requestedTokens.size ? overlap / requestedTokens.size : 0;
  const precision = candidateTokens.size ? overlap / candidateTokens.size : 0;
  const dice = diceCoefficient(requested, candidate);

  if (coverage < 0.72 || precision < 0.58 || dice < 0.5) return -Infinity;
  return Math.round(coverage * 520 + precision * 200 + dice * 280);
}

function readJson(filePath, fallback) {
  return fs.readFile(filePath, "utf8").then(JSON.parse).catch(() => fallback);
}

function normalizeSerial(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "")
    .replace(/-+$/g, "");
}

function productCodeTokens(game, source) {
  const text = String(game.productCode ?? "").toUpperCase();
  const tokens = [];
  for (const prefix of source.prefixes) {
    const regex = new RegExp(`\\b${prefix}-[A-Z0-9-]{2,24}\\b`, "g");
    for (const match of text.matchAll(regex)) {
      let value = normalizeSerial(match[0]);
      value = value.replace(/[-/.](?:DISC|CART|BOX|MANUAL).*$/i, "");
      if (value && !tokens.includes(value)) tokens.push(value);
    }
  }
  return tokens;
}

function serialVariants(serial) {
  const out = [];
  const push = (value) => {
    const normalized = normalizeSerial(value);
    if (normalized && !out.includes(normalized)) out.push(normalized);
  };

  push(serial);

  // Remove common trailing physical-print revision markers, e.g. UKV-1.
  const withoutRevision = serial.replace(/-(\d+)$/i, "");
  push(withoutRevision);

  const parts = withoutRevision.split("-");
  const suffix = parts.at(-1);
  if (suffix && PAL_SUFFIXES.has(suffix)) {
    parts[parts.length - 1] = "EUR";
    push(parts.join("-"));
  }

  return out;
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

function parseSerialDat(content) {
  const index = new Map();
  for (const block of content.split(/\n\s*game\s*\(/i).slice(1)) {
    const comment = block.match(/\bcomment\s+"([^"]+)"/i)?.[1];
    const serial = block.match(/\bserial\s+"([^"]+)"/i)?.[1];
    if (!comment || !serial) continue;
    const key = normalizeSerial(serial);
    const list = index.get(key) ?? [];
    list.push({ comment, serial: key });
    index.set(key, list);
  }
  return index;
}

function chooseSerialIdentity(serialIndex, tokens, game) {
  const candidates = [];
  for (const token of tokens) {
    for (const variant of serialVariants(token)) {
      for (const entry of serialIndex.get(variant) ?? []) {
        const score = titleScore(game.title, entry.comment);
        if (!Number.isFinite(score)) continue;
        candidates.push({ ...entry, matchedSerial: variant, productCode: token, score });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const runnerUp = candidates[1];
  if (!best || best.score < 650) return null;

  if (
    runnerUp &&
    canonicalTitle(best.comment) !== canonicalTitle(runnerUp.comment) &&
    best.score - runnerUp.score < 20 &&
    best.score < 950
  ) {
    return null;
  }

  return best;
}

function filenameBase(filePath) {
  return path.posix.basename(filePath).replace(/\.png$/i, "");
}

function isPalFilename(filePath) {
  const value = normalize(filePath);
  if (value.includes("usa") || value.includes("japan") || value.includes("korea") || value.includes("asia")) {
    return false;
  }
  return PAL_FILENAME_MARKERS.some((marker) => value.includes(normalize(marker)));
}

function countryPreference(game, filePath) {
  const code = String(game.productCode ?? "").toUpperCase();
  const value = normalize(filePath);

  const pairs = [
    [/UKV/, "united kingdom"],
    [/FRA|FRG/, "france"],
    [/ESP/, "spain"],
    [/ITA/, "italy"],
    [/NOE|GER/, "germany"],
    [/AUS/, "australia"],
  ];
  for (const [regex, country] of pairs) {
    if (regex.test(code) && value.includes(country)) return 90;
  }

  if (value.includes("europe")) return 55;
  return 25;
}

function chooseThumbnail(tree, identity, game) {
  const candidates = tree
    .filter(isPalFilename)
    .map((filePath) => {
      const base = filenameBase(filePath);
      const score = titleScore(identity.comment, base);
      if (!Number.isFinite(score)) return null;
      return {
        filePath,
        titleScore: score,
        score: score + countryPreference(game, filePath),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  const runnerUp = candidates[1];
  if (!best || best.titleScore < 700) return null;

  if (
    runnerUp &&
    canonicalTitle(filenameBase(best.filePath)) !== canonicalTitle(filenameBase(runnerUp.filePath)) &&
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

const serialIndexes = new Map();
const trees = new Map();

for (const [platform, source] of Object.entries(SOURCES)) {
  if (!games.some((game) => game.platform === platform)) continue;

  const dat = await githubRaw("libretro/libretro-database", source.serialDat);
  serialIndexes.set(platform, parseSerialDat(dat));
  trees.set(platform, await loadThumbnailTree(source.thumbsRepo));

  console.log(
    `${platform}: ${serialIndexes.get(platform).size} serials + ${trees.get(platform).length} boxart files`,
  );
}

const resolved = [];
const unresolved = [];
let added = 0;
let replaced = 0;

for (const game of games) {
  const source = SOURCES[game.platform];
  if (!source) continue;

  const tokens = productCodeTokens(game, source);
  if (!tokens.length) continue;

  const identity = chooseSerialIdentity(serialIndexes.get(game.platform), tokens, game);
  if (!identity) {
    unresolved.push({
      collectionId: game.collectionId,
      platform: game.platform,
      title: game.title,
      productCode: game.productCode,
      reason: "physical-serial-not-mapped-confidently",
    });
    continue;
  }

  const thumbnail = chooseThumbnail(trees.get(game.platform) ?? [], identity, game);
  if (!thumbnail) {
    unresolved.push({
      collectionId: game.collectionId,
      platform: game.platform,
      title: game.title,
      productCode: game.productCode,
      serial: identity.matchedSerial,
      serialTitle: identity.comment,
      reason: "no-confident-pure-pal-thumbnail",
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
    source: "libretro-nintendo-serial",
    physicalProductCode: game.productCode,
    matchedSerial: identity.matchedSerial,
    serialTitle: identity.comment,
    sourceRepo: source.thumbsRepo,
    sourcePath: thumbnail.filePath,
    sourceImage: sourceUrl,
    matchedBy: "physical-product-code-serial-database",
    matchScore: thumbnail.score,
  };

  if (previous) replaced += 1;
  else added += 1;

  resolved.push({
    collectionId: game.collectionId,
    platform: game.platform,
    title: game.title,
    productCode: game.productCode,
    matchedSerial: identity.matchedSerial,
    serialTitle: identity.comment,
    thumbnail: thumbnail.filePath,
    replacedSource: previous?.source ?? null,
  });

  if (resolved.length % 20 === 0) {
    console.log(`Resolved ${resolved.length} serial-matched Nintendo covers...`);
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
    sourcesTried: [
      "thegamesdb",
      "gametdb",
      "libretro-redump-serial",
      "libretro-nintendo-serial",
    ],
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
    source: "libretro-nintendo-serial",
    resolved: resolved.length,
    added,
    replaced,
    unresolved: unresolved.length,
    entries: resolved,
    unresolvedEntries: unresolved,
  }, null, 2) + "\n",
);
await fs.writeFile(
  GENERATED_MODULE,
  `// Generated by the artwork importer. Do not edit by hand.\nexport const GAME_ARTWORK: Record<string, string> = ${JSON.stringify(artworkMap, null, 2)};\n`,
);

console.log("");
console.log(`Serial-matched Nintendo covers resolved: ${resolved.length}`);
console.log(`Added: ${added}; replaced weaker source: ${replaced}`);
console.log(`Total local artwork: ${manifest.matched}/${games.length}`);
console.log(`Still missing: ${stillMissing.length}`);
