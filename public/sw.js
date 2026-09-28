/* global self */
const OFFLINE_CACHE = "retro-offline-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add("/offline.html")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("retro-offline-shell-") && key !== OFFLINE_CACHE).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

// Private page and API responses are never stored in the service-worker cache.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    url.origin !== self.location.origin ||
    url.pathname === "/login" ||
    url.pathname.startsWith("/logout") ||
    url.pathname.startsWith("/api/")
  ) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const shell = await caches.match("/offline.html");
      return shell || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }),
  );
});
