import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const MAX_EDGE = 1600;
const MIN_BYTES = 1024 * 1024;

export async function optimizeCoverStorage(root = process.cwd(), { dryRun = false } = {}) {
  const report = { scanned: 0, optimized: 0, beforeBytes: 0, afterBytes: 0, files: [] };
  async function walk(directory) {
    for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) { await walk(filename); continue; }
      // Never follow symlinks or touch manifests, alias text, SVGs or animated formats.
      if (!entry.isFile() || !/\.(png|jpe?g)$/i.test(entry.name)) continue;
      report.scanned += 1;
      const input = await fs.readFile(filename);
      report.beforeBytes += input.length;
      report.afterBytes += input.length;
      if (input.length < MIN_BYTES) continue;
      const png = input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const jpeg = input[0] === 255 && input[1] === 216 && input[2] === 255;
      if (!png && !jpeg) continue;
      const metadata = await sharp(input).metadata();
      if ((metadata.pages ?? 1) > 1 || Math.max(metadata.width ?? 0, metadata.height ?? 0) <= MAX_EDGE) continue;
      // The dimension guard also makes repeat builds idempotent: already resized
      // JPEGs are never encoded again. Keep complete artwork; no crop or upscale.
      let pipeline = sharp(input).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
      pipeline = png ? pipeline.png({ compressionLevel: 9, palette: false }) : pipeline.jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true });
      const output = await pipeline.toBuffer();
      if (output.length >= input.length) continue;
      const checked = await sharp(output).metadata();
      if (checked.format !== metadata.format || (metadata.hasAlpha && !checked.hasAlpha)) throw new Error("Cover format/alpha changed: " + filename);
      if (!dryRun) {
        const temporary = filename + ".storage-tmp";
        try { await fs.writeFile(temporary, output); await fs.rename(temporary, filename); }
        finally { await fs.rm(temporary, { force: true }); }
      }
      report.optimized += 1;
      report.afterBytes += output.length - input.length;
      report.files.push({ path: path.relative(root, filename), beforeBytes: input.length, afterBytes: output.length });
    }
  }
  await walk(path.join(root, "public", "covers"));
  return { ...report, savedBytes: report.beforeBytes - report.afterBytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await optimizeCoverStorage(process.cwd(), { dryRun: process.argv.includes("--dry-run") }), null, 2));
}
