import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CANDIDATE_MODULE = path.join(ROOT, "src", "data", "wishlist-artwork-candidates.ts");
const OUTPUT_DIR = path.join(ROOT, "public", "covers", "wishlist-candidates");
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const CONCURRENCY = 8;
const MODULE_PREFIX = "export const WISHLIST_ARTWORK_CANDIDATES: WishlistArtworkCandidate[] = ";

function candidateExtension(candidate) {
  const match = String(candidate.sourcePath ?? "").toLowerCase().match(/\.(png|jpe?g)$/);
  if (!match) return "";
  return match[1] === "png" ? "png" : "jpg";
}

function imageType(bytes) {
  if (bytes.length > 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return "";
}

function validId(value) {
  return /^[a-z0-9][a-z0-9-]*$/i.test(String(value ?? ""));
}

async function loadCandidates() {
  const source = await fs.readFile(CANDIDATE_MODULE, "utf8");
  const start = source.indexOf(MODULE_PREFIX);
  if (start < 0) throw new Error("Wishlist artwork candidate registry marker not found.");
  const jsonStart = start + MODULE_PREFIX.length;
  const end = source.indexOf(";\n", jsonStart);
  if (end < 0) throw new Error("Wishlist artwork candidate registry terminator not found.");
  const candidates = JSON.parse(source.slice(jsonStart, end));
  if (!Array.isArray(candidates)) throw new Error("Wishlist artwork candidate registry must be an array.");
  return candidates;
}

async function fetchBytes(candidate) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(candidate.sourceUrl, {
        headers: { "User-Agent": "RetroCollection-WishlistArtworkMaterializer/1.0" },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("invalid image size");
      return bytes;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }
  throw new Error(`Could not materialize ${candidate.id}: ${String(lastError)}`);
}

async function materialize(candidate) {
  if (!validId(candidate.id)) throw new Error(`Invalid candidate id: ${candidate.id}`);
  const extension = candidateExtension(candidate);
  if (!extension) throw new Error(`Unsupported candidate extension: ${candidate.sourcePath}`);
  const destination = path.join(OUTPUT_DIR, `${candidate.id}.${extension}`);
  try {
    const existing = await fs.readFile(destination);
    if (imageType(existing) === extension && existing.length <= MAX_IMAGE_BYTES) return { downloaded: false };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const bytes = await fetchBytes(candidate);
  const actualType = imageType(bytes);
  if (actualType !== extension) throw new Error(`Candidate ${candidate.id} returned ${actualType || "unsupported"} bytes for .${extension}`);
  await fs.writeFile(destination, bytes);
  return { downloaded: true };
}

const candidates = await loadCandidates();
await fs.mkdir(OUTPUT_DIR, { recursive: true });
const expectedFiles = new Set(candidates.map((candidate) => `${candidate.id}.${candidateExtension(candidate)}`));
for (const name of await fs.readdir(OUTPUT_DIR)) {
  if (!expectedFiles.has(name)) await fs.rm(path.join(OUTPUT_DIR, name), { force: true });
}
let cursor = 0;
let downloaded = 0;
async function worker() {
  while (cursor < candidates.length) {
    const index = cursor;
    cursor += 1;
    const result = await materialize(candidates[index]);
    if (result.downloaded) downloaded += 1;
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, Math.max(candidates.length, 1)) }, () => worker()));
console.log(JSON.stringify({ candidates: candidates.length, downloaded, reused: candidates.length - downloaded, runtimeDirectory: "/covers/wishlist-candidates" }, null, 2));
