"use client";

import { useEffect } from "react";

const SNAPSHOT_KEY = "retro-collection-offline-v1";

export function OfflineSnapshotSync() {
  useEffect(() => {
    const syncSnapshot = async () => {
      if (!navigator.onLine) return;
      try {
        const response = await fetch("/api/offline-snapshot", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) return;
        const snapshot = await response.json();
        if (Array.isArray(snapshot.items) && typeof snapshot.capturedAt === "string") {
          localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
        }
      } catch {
        // Keep the last authenticated snapshot available for read-only offline use.
      }
    };

    const scheduleInitialSync = () => {
      if ("requestIdleCallback" in window) {
        const idleId = window.requestIdleCallback(() => { void syncSnapshot(); }, { timeout: 5000 });
        return () => window.cancelIdleCallback(idleId);
      }
      const timeoutId = window.setTimeout(() => { void syncSnapshot(); }, 1500);
      return () => window.clearTimeout(timeoutId);
    };

    const cancelInitialSync = scheduleInitialSync();
    window.addEventListener("online", syncSnapshot);
    return () => {
      cancelInitialSync();
      window.removeEventListener("online", syncSnapshot);
    };
  }, []);

  return null;
}
