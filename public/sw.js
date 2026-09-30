/*
 * ProfitAI service worker.
 *
 * Keeps the installed app usable as a real app: navigations are served from
 * the network and fall back to the last copy of that page (or /offline.html)
 * when the phone has no connection; hashed build assets, icons and fonts are
 * cached so repeat launches are instant.
 *
 * Nothing dynamic is cached: server-function RPCs (/_serverFn/), Supabase
 * calls and any non-GET request always go straight to the network. Ledger
 * data itself is persisted separately by the app (see src/lib/query-persister.ts).
 *
 * Bump CACHE_VERSION whenever the caching rules below change.
 */
const CACHE_VERSION = "v1";
const PAGES_CACHE = `profitai-pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `profitai-assets-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const FONT_ORIGINS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ASSETS_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("profitai-") && k !== PAGES_CACHE && k !== ASSETS_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "CLEAR_PAGES") {
    // Sent on sign-out so a shared phone never shows another account's ledger offline.
    event.waitUntil(caches.delete(PAGES_CACHE));
  } else if (type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isStaticAsset(url) {
  if (url.origin === self.location.origin) {
    return (
      url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/favicon.ico" ||
      url.pathname === "/manifest.webmanifest" ||
      url.pathname === OFFLINE_URL
    );
  }
  return FONT_ORIGINS.includes(url.origin);
}

function isBypassed(url) {
  if (url.origin !== self.location.origin) return true;
  return url.pathname.startsWith("/_serverFn/") || url.pathname.startsWith("/api/");
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return (
      offline || new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } })
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  if (cached) {
    // Hashed /assets/ files never change; don't hold the response for the refresh.
    return cached;
  }
  const fresh = await refresh;
  return fresh || new Response("", { status: 504 });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (isBypassed(url)) return; // let the browser handle it
});
