/* global self */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
// Phase 1 intentionally keeps collection pages network-only so private collection
// data is not persisted in a service-worker cache after logout.
