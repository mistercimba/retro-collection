import fs from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { del, get, put } from "@vercel/blob";
import { applyWishlistMaintenance, hasConfirmedMaintenanceSnapshot } from "./wishlist-maintenance-logic.mjs";

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
  const rawJson = await new Response(result.stream).text();
  const fingerprint = createHash("sha256").update(rawJson).digest("hex");
  const value = JSON.parse(rawJson);
  if (!validateLibrary(value)) throw new Error("The private library payload is invalid.");
  return {
    rawJson,
    fingerprint,
    library: {
      ...value,
      componentNeeds: value.componentNeeds ?? [],
      nextObjective: value.nextObjective ?? null,
      collectionLists: value.collectionLists ?? [],
      history: value.history ?? [],
    },
  };
}

function summary(report, cleanupArtworkPaths, apply, fingerprint, current, next) {
  const before = new Map(current.wishlist.map((target) => [target.targetId, target]));
  const after = new Map(next.wishlist.map((target) => [target.targetId, target]));
  const removed = current.wishlist.filter((target) => !after.has(target.targetId));
  const added = next.wishlist.filter((target) => !before.has(target.targetId));
  const renamed = next.wishlist.filter((target) => {
    const previous = before.get(target.targetId);
    return previous && (previous.title !== target.title || previous.platform !== target.platform);
  }).map((target) => ({ targetId: target.targetId, from: before.get(target.targetId).title, to: target.title }));
  return {
    mode: apply ? "apply" : "dry-run",
    planId: report.planId,
    safeToApply: report.safeToApply,
    applied: false, // Report is printed before any write, even with --apply.
    sourceWishlistCount: report.sourceWishlistCount,
    finalWishlistCount: report.finalWishlistCount ?? report.sourceWishlistCount,
    operations: report.operations,
    blockers: report.blockers,
    artworkOverridesToDelete: cleanupArtworkPaths.length,
    sourceFingerprintSha256: fingerprint,
    changes: {
      removed: removed.map((item) => ({ targetId: item.targetId, title: item.title, platform: item.platform })),
      added: added.map((item) => ({ targetId: item.targetId, title: item.title, platform: item.platform })),
      renamed,
    },
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const planPath = path.resolve(argValue("--plan") || DEFAULT_PLAN);
  const plan = JSON.parse(await fs.readFile(planPath, "utf8"));

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required. Use an authorized environment; never paste the token into chat or commit it.");
  }

  const { library: current, rawJson, fingerprint } = await readLibrary();
  const nowIso = new Date().toISOString();
  const result = applyWishlistMaintenance(current, plan, { nowIso });
  console.log(JSON.stringify(summary(result.report, result.cleanupArtworkPaths, apply, fingerprint, current, result.library), null, 2));

  if (!result.report.safeToApply) {
    process.exitCode = 2;
    return;
  }

  if (!apply) {
    console.log("\nDry-run only. Review the exact target IDs and rerun with --apply --expected-sha256 <sourceFingerprintSha256>.");
    return;
  }

  if (!hasConfirmedMaintenanceSnapshot(fingerprint, argValue("--expected-sha256"))) {
    throw new Error("No matching dry-run fingerprint. Run the dry-run again, review the changes, and supply --expected-sha256 for this exact private library snapshot.");
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

  // Keep an immutable private rollback copy *before* overwriting the only live library.
  const backupPath = "retro-collection/backups/wishlist-maintenance/" +
    nowIso.replace(/[:.]/g, "-") + "-" + randomUUID() + ".json";
  await put(backupPath, rawJson, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
  });
  console.log("Private backup saved: " + backupPath);

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

  console.log("\nApplied successfully; the private backup is retained at " + backupPath + ".");
  console.log("A fresh app deployment or an in-app mutation is still required to invalidate any existing Next Data Cache for the previous library snapshot.");
}

await main();
