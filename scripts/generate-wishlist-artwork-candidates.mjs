import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  normalizeArtworkTitle,
  sourceArtworkRegion,
  sourceArtworkTitle,
  launchboxArtworkRegion,
  rejectedArtworkSource,
} from "./wishlist-artwork-matcher.mjs";

const ROOT = process.cwd();
const MISSING_FILE = path.join(ROOT, "data", "wishlist-artwork-missing.json");
const REJECTIONS_FILE = path.join(ROOT, "data", "wishlist-artwork-rejections.json");
const OUTPUT_FILE = path.join(ROOT, "src", "data", "wishlist-artwork-candidates.ts");

const REPO_BY_PLATFORM = {
  NES: "Nintendo_-_Nintendo_Entertainment_System",
  SNES: "Nintendo_-_Super_Nintendo_Entertainment_System",
  "Nintendo 64": "Nintendo_-_Nintendo_64",
  "Game Boy": "Nintendo_-_Game_Boy",
  "Game Boy Color": "Nintendo_-_Game_Boy_Color",
  "GameBoy Advance": "Nintendo_-_Game_Boy_Advance",
  GameCube: "Nintendo_-_GameCube",
  "Nintendo DS": "Nintendo_-_Nintendo_DS",
  "Nintendo 3DS": "Nintendo_-_Nintendo_3DS",
  "Nintendo Wii": "Nintendo_-_Wii",
  "Nintendo Wii U": "Nintendo_-_Wii_U",
  "Nintendo Switch": "Nintendo_-_Nintendo_Switch",
  Playstation: "Sony_-_PlayStation",
  "Playstation 2": "Sony_-_PlayStation_2",
  "Playstation 3": "Sony_-_PlayStation_3",
  "Playstation 5": "Sony_-_PlayStation_5",
};

const LAUNCHBOX_BY_PLATFORM = {
  NES: "Nintendo Entertainment System",
  SNES: "Super Nintendo Entertainment System",
  "Nintendo 64": "Nintendo 64",
  "Game Boy": "Nintendo Game Boy",
  "Game Boy Color": "Nintendo Game Boy Color",
  "GameBoy Advance": "Nintendo Game Boy Advance",
  GameCube: "Nintendo GameCube",
  "Nintendo DS": "Nintendo DS",
  "Nintendo 3DS": "Nintendo 3DS",
  "Nintendo Wii": "Nintendo Wii",
  "Nintendo Wii U": "Nintendo Wii U",
  "Nintendo Switch": "Nintendo Switch",
  Playstation: "Sony Playstation",
  "Playstation 2": "Sony Playstation 2",
  "Playstation 3": "Sony Playstation 3",
  "Playstation 5": "Sony Playstation 5",
};

function sha(value, length = 20) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, length);
}
function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}
async function githubJson(url) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RetroCollection-WishlistArtworkCandidates/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}: ${url}`);
  return response.json();
}
async function loadTree(repository) {
  const root = await githubJson(`https://api.github.com/repos/libretro-thumbnails/${repository}/git/trees/master`);
  const boxart = (root.tree ?? []).find((item) => item.type === "tree" && item.path === "Named_Boxarts");
  if (!boxart?.sha) throw new Error(`Named_Boxarts tree not found for ${repository}`);
  const payload = await githubJson(`https://api.github.com/repos/libretro-thumbnails/${repository}/git/trees/${boxart.sha}?recursive=1`);
  if (payload.truncated) throw new Error(`Truncated boxart tree for ${repository}`);
  return { sourceCommit: root.sha, files: (payload.tree ?? []).filter((item) => item.type === "blob" && /\.png$/i.test(item.path ?? "")) };
}
function regionLabel(sourcePath) {
  const groups = [...String(sourcePath).matchAll(/\(([^)]*)\)/g)].map((match) => match[1]);
  const europeAustralia = groups.find((value) => /\beurope\b/i.test(value) && /\baustralia\b/i.test(value));
  if (europeAustralia) return "Europe / Australia";
  return groups.find((value) => /\beurope\b/i.test(value)) ??
    groups.find((value) => /\b(portugal|united kingdom|france|germany|spain|italy|netherlands|ireland|belgium|sweden|norway|denmark|finland|austria|switzerland)\b/i.test(value)) ??
    "Europe";
}
function regionScore(label) {
  const text = String(label).toLowerCase();
  if (text.includes("europe") && text.includes("australia")) return 300;
  if (text === "europe" || text.startsWith("europe,")) return 250;
  if (text.includes("portugal")) return 240;
  return 200;
}
function dedupeSourceCandidates(items) {
  const byBlob = new Map();
  for (const item of items) {
    const previous = byBlob.get(item.blobSha);
    if (!previous || regionScore(item.displayRegion) > regionScore(previous.displayRegion)) byBlob.set(item.blobSha, item);
  }
  return [...byBlob.values()];
}
function launchboxCandidates(target, launchbox) {
  if (!launchbox) return [];
  const sourcePlatform = LAUNCHBOX_BY_PLATFORM[target.platform];
  if (!sourcePlatform || !launchbox.platforms?.includes(sourcePlatform)) return [];
  const title = normalizeArtworkTitle(target.title);
  const games = launchbox.games.filter((game) => game.platform === sourcePlatform && (
    normalizeArtworkTitle(game.title) === title ||
    game.alternates?.some((alternate) => normalizeArtworkTitle(alternate.title) === title && launchboxArtworkRegion(alternate.region) === "Europe")
  ));
  if (games.length !== 1) return [];
  const game = games[0];
  const images = [...new Map((game.images ?? []).filter((item) => item.fileName && launchboxArtworkRegion(item.region) === "Europe").map((item) => [item.fileName, item])).values()];
  if (images.length < 1) return [];
  return images.map((image) => ({
    id: `launchbox-${sha(`${game.databaseId}\0${image.fileName}`)}`,
    title: target.title, platform: target.platform, artworkRegion: "Europe",
    displayRegion: image.region || "Europe", coverVariant: "Standard", source: "launchbox",
    sourcePath: image.fileName, sourceUrl: `https://images.launchbox-app.com/${encodeURIComponent(image.fileName)}`,
    metadataUrl: launchbox.source, metadataSha256: launchbox.metadataSha256,
    launchboxDatabaseId: String(game.databaseId ?? ""), sourcePlatform,
  }));
}

const missing = JSON.parse(await fs.readFile(MISSING_FILE, "utf8"));
const unresolved = (missing.entries ?? []).filter((entry) => entry?.title && entry?.platform);
const rejections = JSON.parse(await fs.readFile(REJECTIONS_FILE, "utf8")).entries ?? [];
const launchboxPath = arg("--launchbox-index");
const launchbox = launchboxPath ? JSON.parse(await fs.readFile(path.resolve(launchboxPath), "utf8")) : null;
const treeCache = new Map();
const records = [];
const audit = [];

for (const target of unresolved) {
  const repository = REPO_BY_PLATFORM[target.platform];
  let libretro = [];
  if (repository) {
    if (!treeCache.has(repository)) {
      try { treeCache.set(repository, await loadTree(repository)); }
      catch { treeCache.set(repository, null); }
    }
    const tree = treeCache.get(repository);
    if (tree) {
      const matches = tree.files.filter((item) =>
        normalizeArtworkTitle(sourceArtworkTitle(item.path)) === normalizeArtworkTitle(target.title) &&
        sourceArtworkRegion(item.path) === "Europe"
      );
      libretro = dedupeSourceCandidates(matches.map((item) => ({
        id: `libretro-${item.sha.slice(0, 20)}`, title: target.title, platform: target.platform,
        artworkRegion: "Europe", displayRegion: regionLabel(item.path), coverVariant: "Standard",
        source: "libretro-thumbnails", sourceRepo: `libretro-thumbnails/${repository}`,
        sourceCommit: tree.sourceCommit, sourcePath: `Named_Boxarts/${item.path}`,
        sourceUrl: `https://raw.githubusercontent.com/libretro-thumbnails/${repository}/${tree.sourceCommit}/Named_Boxarts/${item.path.split("/").map(encodeURIComponent).join("/")}`,
        blobSha: item.sha,
      })).filter((candidate) => !rejectedArtworkSource(candidate, rejections))).map((candidate) => {
        const { blobSha: _dedupeBlobSha, ...publicCandidate } = candidate;
        void _dedupeBlobSha;
        return publicCandidate;
      });
    }
  }
  const secondary = libretro.length ? [] : launchboxCandidates(target, launchbox);
  const found = libretro.length ? libretro : secondary;
  records.push(...found);
  audit.push({ title: target.title, platform: target.platform, reason: target.reason, materializedCandidates: found.length, source: libretro.length ? "libretro-thumbnails" : secondary.length ? "launchbox" : "unresolved" });
}
records.sort((a, b) => a.platform.localeCompare(b.platform, "en-US") || a.title.localeCompare(b.title, "en-US") || regionScore(b.displayRegion) - regionScore(a.displayRegion) || a.sourcePath.localeCompare(b.sourcePath, "en-US"));

const moduleText = `// Generated by scripts/generate-wishlist-artwork-candidates.mjs. Do not edit by hand.
export type WishlistArtworkCandidate = {
  id: string;
  title: string;
  platform: string;
  artworkRegion: "Europe" | "US" | "Japan";
  displayRegion: string;
  coverVariant: string;
  source: "libretro-thumbnails" | "launchbox";
  sourceRepo?: string;
  sourceCommit?: string;
  sourcePath: string;
  sourceUrl: string;
  metadataUrl?: string;
  metadataSha256?: string;
  launchboxDatabaseId?: string;
  sourcePlatform?: string;
};

export const WISHLIST_ARTWORK_CANDIDATES: WishlistArtworkCandidate[] = ${JSON.stringify(records, null, 2)};
`;
await fs.writeFile(OUTPUT_FILE, moduleText);
console.log(JSON.stringify({
  unresolvedTargetsAudited: unresolved.length,
  materializedTargets: audit.filter((item) => item.materializedCandidates > 0).length,
  materializedCandidates: records.length,
  stillUnresolvedTargets: audit.filter((item) => item.materializedCandidates === 0),
  launchboxIndexUsed: Boolean(launchbox),
}, null, 2));
