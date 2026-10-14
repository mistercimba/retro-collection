import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { test } from "node:test";
import { optimizeCoverStorage } from "./optimize-cover-storage.mjs";
const sharp = createRequire(import.meta.url)("sharp");

test("large local artwork keeps format/alpha, dry-run is read-only, repeat is stable", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "cover-storage-"));
  try {
    const dir = path.join(root, "public", "covers", "wishlist-candidates");
    await fs.mkdir(dir, { recursive: true });
    const pixels = Buffer.alloc(2000 * 2400 * 4);
    let seed = 1234;
    for (let i = 0; i < pixels.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; pixels[i] = seed >>> 24; }
    const source = await sharp(pixels, { raw: { width: 2000, height: 2400, channels: 4 } }).png().toBuffer();
    const cover = path.join(dir, "candidate.png");
    await fs.writeFile(cover, source);
    await fs.writeFile(path.join(dir, "alias.png"), "Other (Europe).png");
    await fs.writeFile(path.join(dir, "manifest.json"), "{}");
    const dry = await optimizeCoverStorage(root, { dryRun: true });
    assert.equal(dry.optimized, 1);
    assert.deepEqual(await fs.readFile(cover), source);
    const report = await optimizeCoverStorage(root);
    assert.ok(report.savedBytes > 0);
    const bytes = await fs.readFile(cover);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, "png");
    assert.equal(metadata.hasAlpha, true);
    assert.equal(metadata.height, 1600);
    assert.ok(Math.abs(metadata.width / metadata.height - 2000 / 2400) < 0.001);
    assert.equal((await optimizeCoverStorage(root)).optimized, 0);
    assert.deepEqual(await fs.readFile(cover), bytes);
    assert.equal(await fs.readFile(path.join(dir, "alias.png"), "utf8"), "Other (Europe).png");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
