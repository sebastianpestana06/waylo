/* Waylo SW — only same-origin GETs; never touch Supabase/API calls */
const CACHE = "waylo-shell-v2";
const SHELL = ["/offline", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept API/auth or cross-origin traffic
  if (url.origin !== self.location.origin) return;
  if (req.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/auth/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && req.destination !== "document") {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("/offline")),
      ),
  );
});
