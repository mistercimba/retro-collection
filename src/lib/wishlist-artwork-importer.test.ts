import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { wishlistArtworkIdentity } from "./wishlist-artwork.logic";

describe("edition-aware report-only importer", () => {
  it("regenerates manifest/mapping/missing/report without importing images", () => {
    const root = mkdtempSync(join(tmpdir(), "wishlist-edition-"));
    const json = (path: string, value: unknown) => writeFileSync(join(root, path), JSON.stringify(value));
    try {
      for (const path of ["data", "src/data", "public/covers/wishlist"]) mkdirSync(join(root, path), { recursive: true });
      const original = { targetId: "NOVO", title: "Game", platform: "PS2", targetVersion: "PAL original; loose funcional" };
      const cib = { ...original, targetVersion: "PAL original; CIB" };
      const platinum = { ...original, title: "Other Game", targetVersion: "PAL Platinum; CIB" };
      json("targets.json", [cib, platinum]);
      json("data/artwork-games.json", []);
      json("public/covers/manifest.json", { entries: {} });
      json("data/wishlist-artwork-manifest.json", { schemaVersion: 1, entries: {
        old: { ...original, file: "/covers/wishlist/01234567890123456789.png", source: "libretro-thumbnails" },
        wrongEdition: { ...platinum, targetVersion: "PAL original", file: "/covers/wishlist/11111111111111111111.png" },
      } });
      writeFileSync(join(root, "public/covers/wishlist/01234567890123456789.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"));
      const output = JSON.parse(execFileSync(process.execPath, [resolve("scripts/import-wishlist-artwork.mjs"), "--input", join(root, "targets.json"), "--report-only"], { cwd: root, encoding: "utf8" }));
      const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
      const manifest = read("data/wishlist-artwork-manifest.json");
      expect(manifest.schemaVersion).toBe(2);
      expect(manifest.entries[wishlistArtworkIdentity(cib)].targetVersion).toBe(cib.targetVersion);
      expect(manifest.entries[wishlistArtworkIdentity(cib)].coverVariant).toBe("Standard");
      expect(manifest.entries[wishlistArtworkIdentity(platinum)]).toBeUndefined();
      expect(readFileSync(join(root, "src/data/wishlist-artwork.ts"), "utf8")).toContain("Standard");
      expect(read("data/wishlist-artwork-missing.json").entries[0].reason).toBe("source-artwork-edition-unconfirmed");
      expect(read("data/wishlist-artwork-report.json")).toMatchObject({ dedicatedArtwork: 1, fallback: 1, orphanedMappings: 0 });
      expect(output).toMatchObject({ newlyImported: 0, reportOnly: true });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
