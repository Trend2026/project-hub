// Project Hub service worker — app-shell caching only.
// Supabase API calls always go straight to the network so data is never stale.
var CACHE_NAME = "project-hub-shell-v1";
var SHELL_FILES = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  var url = event.request.url;

  // Never intercept Supabase API traffic — always network, always fresh.
  if (url.indexOf("supabase.co") !== -1) return;

  if (event.request.method !== "GET") return;

  // Network-first for the app shell so pushed updates show up on next load,
  // falling back to cache when offline.
  event.respondWith(
    fetch(event.request)
      .then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        return res;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});
