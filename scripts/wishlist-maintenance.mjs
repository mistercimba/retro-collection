import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { del, get, put } from "@vercel/blob";
import { applyWishlistMaintenance } from "./wishlist-maintenance-logic.mjs";

const LIBRARY_PATH = "retro-collection/library.json";
const DEFAULT_PLAN = path.join(process.cwd(), "data", "wishlist-maintenance-2026-10-08.json");

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function validateLibrary(value) {
  return value &&
    value.schemaVersion === 1 &&
    Array.isArray(value.collection) &&
    Array.isArray(value.wishlist) &&
    Array.isArray(value.purchases) &&
    Array.isArray(value.valuations);
}

async function readLibrary() {
  const result = await get(LIBRARY_PATH, { access: "private", useCache: false });
  if (!result) throw new Error("retro-collection/library.json was not found in the private Blob store.");
  const value = JSON.parse(await new Response(result.stream).text());
  if (!validateLibrary(value)) throw new Error("The private library payload is invalid.");
  return {
    ...value,
    componentNeeds: value.componentNeeds ?? [],
    nextObjective: value.nextObjective ?? null,
    collectionLists: value.collectionLists ?? [],
    history: value.history ?? [],
  };
}

function summary(report, cleanupArtworkPaths, apply) {
  return {
    mode: apply ? "apply" : "dry-run",
    planId: report.planId,
    safeToApply: report.safeToApply,
    applied: report.applied ?? false,
    sourceWishlistCount: report.sourceWishlistCount,
    finalWishlistCount: report.finalWishlistCount ?? report.sourceWishlistCount,
    operations: report.operations,
    blockers: report.blockers,
    artworkOverridesToDelete: cleanupArtworkPaths.length,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const planPath = path.resolve(argValue("--plan") || DEFAULT_PLAN);
  const plan = JSON.parse(await fs.readFile(planPath, "utf8"));

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required. Use an authorized environment; never paste the token into chat or commit it.");
  }

  const current = await readLibrary();
  const nowIso = new Date().toISOString();
  const result = applyWishlistMaintenance(current, plan, { nowIso });
  console.log(JSON.stringify(summary(result.report, result.cleanupArtworkPaths, apply), null, 2));

  if (!result.report.safeToApply) {
    process.exitCode = 2;
    return;
  }

  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply after reviewing the report.");
    return;
  }

  const next = {
    ...result.library,
    schemaVersion: 1,
    updatedAt: nowIso,
    componentNeeds: result.library.componentNeeds ?? [],
    nextObjective: result.library.nextObjective ?? null,
    collectionLists: result.library.collectionLists ?? [],
    history: result.library.history ?? [],
  };

  await put(LIBRARY_PATH, JSON.stringify(next), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });

  for (const pathname of result.cleanupArtworkPaths) {
    try {
      await del(pathname);
    } catch (error) {
      console.warn("Could not delete stale Wishlist artwork override after successful library save.", {
        pathname,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  console.log("\nApplied. A fresh app deployment or an in-app mutation is still required to invalidate any existing Next Data Cache for the previous library snapshot.");
}

await main();
