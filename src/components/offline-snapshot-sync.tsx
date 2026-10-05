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

    const timeoutId = window.setTimeout(() => { void syncSnapshot(); }, 1500);
    window.addEventListener("online", syncSnapshot);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("online", syncSnapshot);
    };
  }, []);

  return null;
}
