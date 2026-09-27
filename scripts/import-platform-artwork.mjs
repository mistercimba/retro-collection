import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const sources = JSON.parse(await fs.readFile(path.join(ROOT, "data", "platform-artwork-sources.json"), "utf8"));
const outDir = path.join(ROOT, "public", "platforms");
const generatedModule = path.join(ROOT, "src", "data", "platform-artwork.ts");

await fs.mkdir(outDir, { recursive: true });

function extensionFor(contentType, url) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.includes(".png")) return "png";
  if (pathname.includes(".webp")) return "webp";
  return "jpg";
}

async function resolveImage(title) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    prop: "pageimages",
    piprop: "thumbnail|original",
    pithumbsize: "1200",
    pilicense: "any",
    titles: title,
  });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": "MarioRetroCollection-platform-importer" },
  });
  if (!response.ok) throw new Error(`Wikipedia API returned ${response.status} for ${title}`);
  const payload = await response.json();
  const page = payload.query?.pages?.[0];
  return page?.thumbnail?.source || page?.original?.source || null;
}

const mapping = {};

for (const source of sources) {
  const imageUrl = await resolveImage(source.wikipediaTitle);
  if (!imageUrl) {
    console.warn(`No platform image found: ${source.platform}`);
    continue;
  }

  const response = await fetch(imageUrl, {
    headers: { "User-Agent": "MarioRetroCollection-platform-importer" },
  });
  if (!response.ok) throw new Error(`Image download returned ${response.status}: ${imageUrl}`);

  const ext = extensionFor(response.headers.get("content-type") ?? "", imageUrl);
  for (const oldExt of ["png", "jpg", "jpeg", "webp"]) {
    if (oldExt !== ext) await fs.rm(path.join(outDir, `${source.key}.${oldExt}`), { force: true });
  }

  const file = `/platforms/${source.key}.${ext}`;
  await fs.writeFile(path.join(outDir, `${source.key}.${ext}`), Buffer.from(await response.arrayBuffer()));
  mapping[source.platform] = file;
  console.log(`${source.platform} -> ${file}`);
}

const moduleText =
  "export const PLATFORM_ARTWORK: Record<string, string> = " +
  JSON.stringify(mapping, null, 2) +
  ";\n";

await fs.writeFile(generatedModule, moduleText);
await fs.writeFile(
  path.join(outDir, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), entries: mapping }, null, 2) + "\n",
);

console.log(`Imported ${Object.keys(mapping).length}/${sources.length} platform images locally.`);
