import fs from "node:fs/promises";
import path from "node:path";
import { collectionWishlistArtworkRegion } from "../src/lib/wishlist-artwork-region.mjs";
import { createHash } from "node:crypto";
import {
  findExactSourceMatches,
  findExactLaunchboxMatch,
  rejectedArtworkSource,
  normalizeArtworkTitle,
  requestedArtworkRegion,
  sourceArtworkRegion,
  sourceArtworkTitle,
} from "./wishlist-artwork-matcher.mjs";

const ROOT = process.cwd();
const COVERS_DIR = path.join(ROOT, "public", "covers", "wishlist");
const MANIFEST_FILE = path.join(ROOT, "data", "wishlist-artwork-manifest.json");
const MISSING_FILE = path.join(ROOT, "data", "wishlist-artwork-missing.json");
const REPORT_FILE = path.join(ROOT, "data", "wishlist-artwork-report.json");
const GENERATED_MODULE = path.join(ROOT, "src", "data", "wishlist-artwork.ts");
const SOURCE_CACHE_DIR = path.join("/tmp", "retro-collection-wishlist-artwork-cache");
const COLLECTION_GAMES_FILE = path.join(ROOT, "data", "artwork-games.json");
const COLLECTION_MANIFEST_FILE = path.join(ROOT, "public", "covers", "manifest.json");
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const LAUNCHBOX_BY_PLATFORM = {
  nes: "Nintendo Entertainment System", snes: "Super Nintendo Entertainment System",
  "nintendo 64": "Nintendo 64", "game boy": "Nintendo Game Boy",
  "game boy color": "Nintendo Game Boy Color", "game boy advance": "Nintendo Game Boy Advance",
  gamecube: "Nintendo GameCube", "nintendo ds": "Nintendo DS", "nintendo 3ds": "Nintendo 3DS",
  "nintendo wii": "Nintendo Wii", "nintendo wii u": "Nintendo Wii U", "nintendo switch": "Nintendo Switch",
  playstation: "Sony Playstation", "playstation 2": "Sony Playstation 2",
  "playstation 3": "Sony Playstation 3", "playstation 5": "Sony Playstation 5",
};

const REPO_BY_PLATFORM = {
  nes: "Nintendo_-_Nintendo_Entertainment_System",
  snes: "Nintendo_-_Super_Nintendo_Entertainment_System",
  "nintendo 64": "Nintendo_-_Nintendo_64",
  "game boy": "Nintendo_-_Game_Boy",
  "game boy color": "Nintendo_-_Game_Boy_Color",
  "game boy advance": "Nintendo_-_Game_Boy_Advance",
  gamecube: "Nintendo_-_GameCube",
  "nintendo ds": "Nintendo_-_Nintendo_DS",
  "nintendo 3ds": "Nintendo_-_Nintendo_3DS",
  "nintendo wii": "Nintendo_-_Wii",
  "nintendo wii u": "Nintendo_-_Wii_U",
  "nintendo switch": "Nintendo_-_Nintendo_Switch",
  playstation: "Sony_-_PlayStation",
  "playstation 2": "Sony_-_PlayStation_2",
  "playstation 3": "Sony_-_PlayStation_3",
  "playstation 5": "Sony_-_PlayStation_5",
};

const PLATFORM_ALIASES = {
  "nintendo entertainment system": "nes", nes: "nes",
  "super nintendo entertainment system": "snes", "super nintendo": "snes", snes: "snes",
  "nintendo 64": "nintendo 64", n64: "nintendo 64",
  "nintendo game boy": "game boy", "game boy": "game boy", gameboy: "game boy",
  "nintendo game boy color": "game boy color", "game boy color": "game boy color", "gameboy color": "game boy color",
  "nintendo game boy advance": "game boy advance", "game boy advance": "game boy advance", "gameboy advance": "game boy advance", gba: "game boy advance",
  "nintendo gamecube": "gamecube", gamecube: "gamecube",
  "nintendo ds": "nintendo ds", ds: "nintendo ds",
  "nintendo 3ds": "nintendo 3ds", "3ds": "nintendo 3ds",
  "nintendo wii": "nintendo wii", wii: "nintendo wii",
  "nintendo wii u": "nintendo wii u", "wii u": "nintendo wii u",
  "nintendo switch": "nintendo switch", switch: "nintendo switch",
  "sony playstation": "playstation", playstation: "playstation", ps1: "playstation",
  "sony playstation 2": "playstation 2", "playstation 2": "playstation 2", ps2: "playstation 2",
  "sony playstation 3": "playstation 3", "playstation 3": "playstation 3", ps3: "playstation 3",
  "sony playstation 5": "playstation 5", "playstation 5": "playstation 5", ps5: "playstation 5",
};

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function canonicalPlatform(value) {
  const normalized = normalize(value);
  return PLATFORM_ALIASES[normalized] ?? normalized;
}

function identityKey(target) {
  return JSON.stringify([
    target.targetId,
    canonicalPlatform(target.platform),
    normalizeArtworkTitle(target.title),
    requestedArtworkRegion(target.targetVersion),
  ]);
}

function sha(value, length = 20) {
  return createHash("sha256").update(value).digest("hex").slice(0, length);
}

function inputPath() {
  const index = process.argv.indexOf("--input");
  const file = index >= 0 ? process.argv[index + 1] : "";
  if (!file) throw new Error("Uso: npm run wishlist-artwork:import -- --input /tmp/wishlist-targets.json");
  return path.resolve(file);
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

async function githubJson(url) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RetroCollection-WishlistArtwork/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}: ${url}`);
  return response.json();
}

async function loadTree(repository) {
  await fs.mkdir(SOURCE_CACHE_DIR, { recursive: true });
  const cacheFile = path.join(SOURCE_CACHE_DIR, `${repository}.json`);
  const cached = await readJson(cacheFile, null);
  if (cached?.files?.length && cached?.sourceCommit) return cached;

  const root = await githubJson(`https://api.github.com/repos/libretro-thumbnails/${repository}/git/trees/master`);
  const boxart = (root.tree ?? []).find((item) => item.type === "tree" && item.path === "Named_Boxarts");
  if (!boxart?.sha) throw new Error(`Named_Boxarts tree not found for ${repository}`);
  const payload = await githubJson(`https://api.github.com/repos/libretro-thumbnails/${repository}/git/trees/${boxart.sha}?recursive=1`);
  if (payload.truncated) throw new Error(`Truncated boxart tree for ${repository}`);
  const result = {
    sourceCommit: root.sha,
    files: (payload.tree ?? [])
      .filter((item) => item.type === "blob" && /\.png$/i.test(item.path ?? "") && !/(?:screenshot|title ?screen|logo|back ?cover|fan ?art)/i.test(item.path))
      .map((item) => item.path),
  };
  await fs.writeFile(cacheFile, JSON.stringify(result));
  return result;
}

function validTarget(target) {
  return target && ["targetId", "title", "platform", "targetVersion"].every((key) => typeof target[key] === "string") && target.title.trim() && target.platform.trim();
}

function argument(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}
const reportOnly = process.argv.includes("--report-only");
const selectedPlatforms = process.argv.flatMap((value, index) => value === "--platform" ? [canonicalPlatform(process.argv[index + 1])] : []);
const limit = Number(argument("--limit", "12"));
if ((!reportOnly && !selectedPlatforms.length) || !Number.isInteger(limit) || limit < 1 || limit > 15) {
  throw new Error("Specify --platform (repeatable) and --limit between 1 and 15. Each run is a checkpoint batch.");
}
const launchboxFile = argument("--launchbox-index");
const launchbox = launchboxFile ? await readJson(path.resolve(launchboxFile), null) : null;
const previousMissing = await readJson(MISSING_FILE, { entries: [] });
const rejections = (await readJson(path.join(ROOT, "data", "wishlist-artwork-rejections.json"), { entries: [] })).entries;
const previousReasons = new Map(previousMissing.entries.map((entry) => [entry.identityHash, entry]));
let newlyImported = 0;

const input = JSON.parse(await fs.readFile(inputPath(), "utf8"));
const targets = Array.isArray(input) ? input : input.targets;
if (!Array.isArray(targets) || !targets.every(validTarget)) {
  throw new Error("Input must contain targets with targetId, title, platform, and targetVersion strings.");
}
const activeWishlistTotal = Array.isArray(input) ? targets.length : Number(input.activeWishlistTotal ?? targets.length);
const platformTotals = Array.isArray(input) ? {} : (input.platformTotals ?? {});
if (!Number.isInteger(activeWishlistTotal) || activeWishlistTotal < targets.length) {
  throw new Error("activeWishlistTotal must be an integer greater than or equal to the input target count.");
}

const uniqueTargets = [...new Map(targets.map((target) => [identityKey(target), target])).values()];
const currentKeys = new Set(uniqueTargets.map(identityKey));
const [manifest, games, collectionArtwork] = await Promise.all([
  readJson(MANIFEST_FILE, { schemaVersion: 1, generatedAt: "", source: "libretro-thumbnails/Named_Boxarts", entries: {} }),
  readJson(COLLECTION_GAMES_FILE, []),
  readJson(COLLECTION_MANIFEST_FILE, { entries: {} }),
]);
manifest.entries ??= {};
const filesUsed = new Set(Object.values(manifest.entries).map((entry) => entry.file));
const importedKeys = new Set();
const localCandidates = new Map();
const unresolved = [];
const sourceErrors = [];
const withdrawnAmbiguous = [];

// Revalidate earlier imports under the same parser before trusting an existing
// manifest entry. Source revision/language metadata must not hide duplicates.
for (const [key, entry] of Object.entries(manifest.entries)) {
  const rejected = rejectedArtworkSource(entry, rejections);
  if (!rejected && (reportOnly || entry.source !== "libretro-thumbnails")) continue;
  let matches = [];
  if (!rejected) {
    const repository = entry.sourceRepo?.split("/")[1];
    if (!repository) throw new Error(`Missing provenance for ${entry.title}`);
    if (!localCandidates.has(repository)) localCandidates.set(repository, await loadTree(repository));
    const tree = localCandidates.get(repository);
    const candidates = tree.files.map((sourcePath) => ({
      sourcePath, title: sourceArtworkTitle(sourcePath), region: sourceArtworkRegion(sourcePath),
    }));
    matches = findExactSourceMatches(entry, candidates);
    if (matches.length === 1 && `Named_Boxarts/${matches[0].sourcePath}` === entry.sourcePath) continue;
  }
  delete manifest.entries[key];
  withdrawnAmbiguous.push({ title: entry.title, platform: entry.platform, candidateCount: matches.length });
  previousReasons.set(sha(key), {
    identityHash: sha(key), title: entry.title, platform: entry.platform,
    reason: rejected?.reason ?? (matches.length > 1 ? "ambiguous-source-candidates" : "source-match-no-longer-valid"),
    candidateCount: matches.length,
  });
  if (!Object.values(manifest.entries).some((other) => other.file === entry.file)) {
    filesUsed.delete(entry.file);
    await fs.unlink(path.join(ROOT, "public", entry.file.replace(/^\//, ""))).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

for (const target of uniqueTargets) {
  const key = identityKey(target);
  const existing = manifest.entries[key];
  if (existing?.file) {
    try {
      const bytes = await fs.readFile(path.join(ROOT, "public", existing.file.replace(/^\//, "")));
      if (!validImageBytes(bytes) || (existing.imageSha256 && existing.imageSha256 !== sha(bytes, 64))) throw new Error("Invalid local artwork");
      existing.imageSha256 = sha(bytes, 64);
      importedKeys.add(key);
      existing.targetVersion = target.targetVersion;
      existing.title = target.title;
      existing.platform = target.platform;
      continue;
    } catch {
      delete manifest.entries[key];
      filesUsed.delete(existing.file);
      await fs.unlink(path.join(ROOT, "public", existing.file.replace(/^\//, ""))).catch((error) => { if (error.code !== "ENOENT") throw error; });
      previousReasons.set(sha(key), { identityHash: sha(key), title: target.title, platform: target.platform, reason: "invalid-local-artwork" });
    }
  }

  const platform = canonicalPlatform(target.platform);
  if (reportOnly || !selectedPlatforms.includes(platform) || newlyImported >= limit) {
    unresolved.push(previousReasons.get(sha(key)) ?? {
      identityHash: sha(key), title: target.title, platform: target.platform,
      reason: reportOnly ? "not-imported" : newlyImported >= limit && selectedPlatforms.includes(platform) ? "checkpoint-batch-limit" : "platform-not-processed",
    });
    continue;
  }
  const repository = REPO_BY_PLATFORM[platform];
  let reason = "unsupported-platform";
  let candidateCount = 0;
  let source = null;
  if (repository) {
    if (!localCandidates.has(repository)) {
      try { localCandidates.set(repository, await loadTree(repository)); }
      catch (error) {
        sourceErrors.push({ platform: target.platform, source: repository, error: String(error) });
        localCandidates.set(repository, null);
      }
    }
    const tree = localCandidates.get(repository);
    reason = "source-unavailable";
    if (tree) {
      const candidates = tree.files.map((sourcePath) => ({
        sourcePath, title: sourceArtworkTitle(sourcePath), region: sourceArtworkRegion(sourcePath),
      }));
      const exactTitle = candidates.filter((candidate) => normalizeArtworkTitle(candidate.title) === normalizeArtworkTitle(target.title));
      const regional = findExactSourceMatches(target, candidates);
      candidateCount = regional.length || exactTitle.length;
      reason = regional.length > 1 ? "ambiguous-source-candidates" : exactTitle.length ? "region-mismatch" : "no-exact-title-platform-match";
      if (regional.length === 1) {
        const match = regional[0];
        const sourcePath = `Named_Boxarts/${match.sourcePath}`;
        source = {
          source: "libretro-thumbnails", sourceTitle: match.title,
          sourceUrl: `https://raw.githubusercontent.com/libretro-thumbnails/${repository}/${tree.sourceCommit}/${sourcePath.split("/").map(encodeURIComponent).join("/")}`,
          sourceRepo: `libretro-thumbnails/${repository}`, sourceCommit: tree.sourceCommit, sourcePath,
        };
      }
    }
  }
  // A second source may fill a missing/incompatible source, but never overrides
  // known ambiguous candidates or selects a preferred variant among them.
  if (!source && reason !== "ambiguous-source-candidates" && launchbox?.platforms?.includes(LAUNCHBOX_BY_PLATFORM[platform])) {
    const match = findExactLaunchboxMatch(target, launchbox.games, LAUNCHBOX_BY_PLATFORM[platform]);
    if (match.game) source = {
      source: "launchbox", sourceTitle: match.game.title,
      sourceUrl: `https://images.launchbox-app.com/${encodeURIComponent(match.image.fileName)}`,
      sourcePath: match.image.fileName, launchboxDatabaseId: match.game.databaseId,
      sourcePlatform: match.game.platform, sourceRegion: match.image.region,
      metadataUrl: launchbox.source, metadataSha256: launchbox.metadataSha256,
    };
    else { reason = match.reason; candidateCount = match.candidateCount; }
  }
  if (!source) {
    unresolved.push({ identityHash: sha(key), title: target.title, platform: target.platform, reason, candidateCount });
    continue;
  }
  const rejected = rejectedArtworkSource(source, rejections);
  if (rejected) {
    unresolved.push({ identityHash: sha(key), title: target.title, platform: target.platform, reason: rejected.reason });
    continue;
  }

  let response;
  try { response = await fetch(source.sourceUrl, { headers: { "User-Agent": "RetroCollection-WishlistArtwork/1.0" }, signal: AbortSignal.timeout(30000) }); }
  catch {
    unresolved.push({ identityHash: sha(key), title: target.title, platform: target.platform, reason: "download-failed" });
    continue;
  }
  if (!response.ok) {
    unresolved.push({ identityHash: sha(key), title: target.title, platform: target.platform, reason: "download-failed" });
    continue;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const isPng = bytes.length > 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!validImageBytes(bytes)) {
    unresolved.push({ identityHash: sha(key), title: target.title, platform: target.platform, reason: bytes.length > MAX_IMAGE_BYTES ? "image-too-large" : "unsupported-image-type" });
    continue;
  }
  const fileName = `${sha(`${key}\0${source.sourcePath}`)}.${isPng ? "png" : "jpg"}`;
  const relativeFile = `/covers/wishlist/${fileName}`;
  const destination = path.join(COVERS_DIR, fileName);
  await fs.mkdir(COVERS_DIR, { recursive: true });
  if (!filesUsed.has(relativeFile)) await fs.writeFile(destination, bytes, { flag: "wx" }).catch((error) => {
    if (error.code !== "EEXIST") throw error;
  });
  manifest.entries[key] = {
    targetId: target.targetId, title: target.title, platform: target.platform,
    targetVersion: target.targetVersion, file: relativeFile,
    ...source, imageSha256: sha(bytes, 64),
    region: requestedArtworkRegion(target.targetVersion),
    matchMethod: "exact-normalized-title-platform-region",
  };
  newlyImported += 1;
  filesUsed.add(relativeFile);
  importedKeys.add(key);
}

const reused = new Set();
for (const target of uniqueTargets) {
  const key = identityKey(target);
  if (importedKeys.has(key)) continue;
  const title = normalizeArtworkTitle(target.title);
  const platform = canonicalPlatform(target.platform);
  const matches = [];
  for (const game of games) {
    if (canonicalPlatform(game.platform) !== platform || normalizeArtworkTitle(game.title) !== title) continue;
    const entry = collectionArtwork.entries?.[game.collectionId];
    if (collectionWishlistArtworkRegion(entry?.regionName) !== requestedArtworkRegion(target.targetVersion)) continue;
    const file = entry?.file;
    if (!file) continue;
    try { await fs.access(path.join(ROOT, "public", file.replace(/^\//, ""))); matches.push(file); }
    catch { /* skip entries whose local image is missing */ }
  }
  if (matches.length === 1) reused.add(key);
  else if (matches.length > 1) unresolved.push({ identityHash: sha(key), title: target.title, platform: target.platform, reason: "ambiguous-collection-artwork", candidateCount: matches.length });
}

const unresolvedByHash = new Map();
for (const item of unresolved) unresolvedByHash.set(item.identityHash, item);
const reusedHashes = new Set([...reused].map((key) => sha(key)));
const finalUnresolved = [...unresolvedByHash.values()].filter((entry) => !reusedHashes.has(entry.identityHash));
const orphaned = Object.keys(manifest.entries).filter((key) => !currentKeys.has(key));
const manifestFiles = new Set(Object.values(manifest.entries).map((entry) => entry.file));
for (const fileName of await fs.readdir(COVERS_DIR)) {
  if (/^[a-f0-9]{20}\.(png|jpg)$/.test(fileName) && !manifestFiles.has(`/covers/wishlist/${fileName}`)) {
    await fs.unlink(path.join(COVERS_DIR, fileName));
    filesUsed.delete(`/covers/wishlist/${fileName}`);
  }
}
manifest.generatedAt = new Date().toISOString();
manifest.entries = Object.fromEntries(Object.entries(manifest.entries).sort(([a], [b]) => a.localeCompare(b)));
await fs.mkdir(path.dirname(MANIFEST_FILE), { recursive: true });
await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");

const dedicatedCount = uniqueTargets.filter((target) => importedKeys.has(identityKey(target))).length;
const reusedCount = uniqueTargets.filter((target) => reused.has(identityKey(target))).length;
const unexportedCount = activeWishlistTotal - uniqueTargets.length;
const fallbackCount = activeWishlistTotal - dedicatedCount - reusedCount;
const reasonCounts = Object.fromEntries([...new Set(finalUnresolved.map((entry) => entry.reason))].sort().map((reason) => [reason, finalUnresolved.filter((entry) => entry.reason === reason).length]));
if (unexportedCount > 0) reasonCounts["targets-not-exported"] = unexportedCount;
const exportedPlatformTotals = {};
for (const target of uniqueTargets) exportedPlatformTotals[target.platform] = (exportedPlatformTotals[target.platform] ?? 0) + 1;
const perPlatform = Object.fromEntries(Object.entries({ ...exportedPlatformTotals, ...platformTotals }).map(([platform, total]) => [platform, { total: Number(total) || 0, dedicated: 0, reused: 0, fallback: 0 }]));
for (const target of uniqueTargets) {
  const platform = target.platform;
  perPlatform[platform] ??= { total: 0, dedicated: 0, reused: 0, fallback: 0 };
  if (importedKeys.has(identityKey(target))) perPlatform[platform].dedicated += 1;
  else if (reused.has(identityKey(target))) perPlatform[platform].reused += 1;
}
for (const stats of Object.values(perPlatform)) {
  stats.fallback = stats.total - stats.dedicated - stats.reused;
  stats.coverage = stats.total ? Number(((stats.dedicated + stats.reused) / stats.total * 100).toFixed(1)) : 0;
}

const generatedMap = Object.fromEntries(uniqueTargets
  .filter((target) => manifest.entries[identityKey(target)]?.file)
  .map((target) => [identityKey(target), manifest.entries[identityKey(target)].file]));
await fs.writeFile(GENERATED_MODULE,
  `// Generated by scripts/import-wishlist-artwork.mjs. Do not edit by hand.\nexport const WISHLIST_ARTWORK: Record<string, string> = ${JSON.stringify(generatedMap, null, 2)};\n`);
await fs.writeFile(MISSING_FILE, JSON.stringify({
  generatedAt: new Date().toISOString(), activeWishlistTotal, fallback: fallbackCount,
  reasonCounts,
  entries: [...finalUnresolved, ...(unexportedCount > 0 ? [{ reason: "targets-not-exported", count: unexportedCount }] : [])],
}, null, 2) + "\n");
const activeAssetFiles = [...new Set(uniqueTargets.filter((target) => importedKeys.has(identityKey(target))).map((target) => manifest.entries[identityKey(target)].file))];
const assetSizes = await Promise.all(activeAssetFiles.map(async (file) => ({ file, bytes: (await fs.stat(path.join(ROOT, "public", file.replace(/^\//, "")))).size })));
const totalBytes = assetSizes.reduce((total, asset) => total + asset.bytes, 0);
const assetStats = { files: assetSizes.length, totalBytes, averageBytes: assetSizes.length ? Math.round(totalBytes / assetSizes.length) : 0,
  largestFile: assetSizes.reduce((largest, asset) => !largest || asset.bytes > largest.bytes ? asset : largest, null) };
await fs.writeFile(REPORT_FILE, JSON.stringify({
  generatedAt: new Date().toISOString(), activeWishlistTotal, dedicatedArtwork: dedicatedCount,
  reusedCollectionArtwork: reusedCount, fallback: fallbackCount,
  coverage: activeWishlistTotal ? Number(((dedicatedCount + reusedCount) / activeWishlistTotal * 100).toFixed(1)) : 0,
  coverageByPlatform: perPlatform,
  sourceCounts: Object.fromEntries([...new Set(Object.values(manifest.entries).map((entry) => entry.source))].map((source) => [source, uniqueTargets.filter((target) => importedKeys.has(identityKey(target)) && manifest.entries[identityKey(target)].source === source).length])),
  unresolvedReasons: reasonCounts,
  orphanedMappings: orphaned.length,
  orphanedAssets: [...filesUsed].filter((file) => !Object.values(manifest.entries).some((entry) => entry.file === file)),
  sourceErrors, assetStats,
}, null, 2) + "\n");

console.log(JSON.stringify({
  newlyImported, reportOnly, selectedPlatforms, withdrawnAmbiguous, activeWishlistTotal, dedicatedArtwork: dedicatedCount, reusedCollectionArtwork: reusedCount,
  fallback: fallbackCount,
  coverage: activeWishlistTotal ? Number(((dedicatedCount + reusedCount) / activeWishlistTotal * 100).toFixed(1)) : 0,
  coverageByPlatform: perPlatform, unresolvedReasons: reasonCounts,
  orphanedMappings: orphaned.length, sourceErrors,
}, null, 2));

function validImageBytes(bytes) {
  const png = bytes.length > 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  return (png || jpeg) && bytes.length <= MAX_IMAGE_BYTES;
}
