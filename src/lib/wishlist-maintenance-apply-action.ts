"use server";

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authEnabled, isAuthenticated } from "@/lib/auth";
import { getFreshLibrarySnapshot, getFreshLibrary, saveLibrary } from "@/lib/library-store";
import type { LibraryData } from "@/lib/data/types";
import { maintenanceSnapshotConfirmed, prepareApprovedWishlistCleanup } from "@/lib/wishlist-maintenance-apply.logic";
import type { WishlistMaintenanceLibrary, WishlistMaintenancePlan } from "../../scripts/wishlist-maintenance-logic.mjs";
import plan from "../../data/wishlist-maintenance-2026-10-08.json";

export async function applyApprovedWishlistCleanup(form: FormData) {
  // Preview deployments may share the real Blob credential. It must be
  // impossible to use them to apply this production-only maintenance.
  if (process.env.VERCEL_ENV !== "production" || !authEnabled() || !(await isAuthenticated())) {
    throw new Error("Manutenção indisponível fora de produção autenticada.");
  }
  if (form.get("approved") !== "yes") {
    redirect("/maintenance/wishlist?result=confirmation-missing");
  }
  const expectedSha256 = String(form.get("snapshotSha256") ?? "");
  let outcome = "blocked";
  let backupPath = "";

  try {
    const before = await getFreshLibrarySnapshot();
    if (!maintenanceSnapshotConfirmed(before.sha256, expectedSha256)) {
      outcome = "stale";
    } else {
      const prepared = prepareApprovedWishlistCleanup(
        before.library as unknown as WishlistMaintenanceLibrary,
        plan as WishlistMaintenancePlan,
        new Date().toISOString(),
      );
      // An immutable recovery copy of the EXACT original bytes is created
      // BEFORE any destructive write to the live library.
      backupPath = "retro-collection/backups/wishlist-maintenance/" +
        new Date().toISOString().replace(/[:.]/g, "-") + "-" + randomUUID() + ".json";
      await put(backupPath, before.rawJson, {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/json",
      });

      // Abort if any mutation occurred while uploading the backup. This is a
      // single-user app, not a transactional compare-and-swap database.
      const current = await getFreshLibrarySnapshot();
      if (!maintenanceSnapshotConfirmed(current.sha256, before.sha256)) {
        outcome = "stale-after-backup";
      } else {
        const saved = await saveLibrary(prepared as LibraryData);
        revalidatePath("/want");
        revalidatePath("/maintenance/wishlist");
        revalidatePath("/history");
        const persisted = await getFreshLibrary();
        outcome = persisted.updatedAt === saved.updatedAt &&
          JSON.stringify(persisted.wishlist) === JSON.stringify(saved.wishlist) &&
          persisted.wishlist.length === 291 &&
          JSON.stringify(persisted.nextObjective) === JSON.stringify(before.library.nextObjective)
          ? "applied" : "verify-failed";
      }
    }
  } catch (error) {
    console.error("wishlist_live_cleanup_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      // No user data, auth credentials or full raw JSON in logs.
      backupCreated: Boolean(backupPath),
    });
    outcome = "failed";
  }

  if (backupPath) {
    console.info("wishlist_maintenance_private_backup", { pathname: backupPath, outcome });
  }
  redirect("/maintenance/wishlist?result=" + encodeURIComponent(outcome));
}
