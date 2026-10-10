/* BamBoozle service worker. VERSION is bumped by tools/build.py on every build. */
const VERSION = 'v2-ce7256a3a3';
const SHELL_CACHE = 'vhh-shell-' + VERSION;
const TILE_CACHE = 'vhh-tiles-v2';
const RUNTIME_CACHE = 'vhh-runtime-v1';
const MAX_TILES = 2500;      // vector tiles + glyphs + sprites (~20-40 MB worst case)
const MAX_RUNTIME = 60;
const SHELL = [
  './', 'index.html', 'app.css', 'native.js', 'app.js', 'fonts/inter-latin-wght.woff2', 'data.json', 'manifest.webmanifest',
  'vendor/leaflet.css', 'vendor/leaflet.js', 'vendor/maplibre-gl.css', 'vendor/maplibre-gl.js', 'vendor/leaflet-maplibre-gl.js', 'vendor/MarkerCluster.css', 'vendor/leaflet.markercluster.js',
  'vendor/images/layers.png', 'vendor/images/layers-2x.png', 'vendor/images/marker-icon.png', 'vendor/images/marker-icon-2x.png', 'vendor/images/marker-shadow.png',
  'icons/favicon-32.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/icon-maskable-192.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => (k.startsWith('vhh-shell-') && k !== SHELL_CACHE) || (k.startsWith('vhh-tiles-') && k !== TILE_CACHE)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

async function networkFirst(req) {
  const c = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) c.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(req, {ignoreSearch: true}) || (req.mode === 'navigate' ? await c.match('index.html') : null);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName, max) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) { c.put(req, res.clone()).then(() => trim(cacheName, max)); }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // HTML + data: network-first so updates show up; everything else: cache-first from the shell cache
    // HTML + JS/CSS + data + web manifest: network-first so rename / deal updates land quickly
    const path = url.pathname;
    const isShellDoc = req.mode === 'navigate' || path.endsWith('/index.html') || path.endsWith('/') || path.endsWith('/data.json') || path.endsWith('/app.js') || path.endsWith('/app.css') || path.endsWith('/manifest.webmanifest');
    if (isShellDoc) {
      e.respondWith(networkFirst(req));
    } else {
      e.respondWith(caches.open(SHELL_CACHE).then(c => c.match(req, {ignoreSearch: true})).then(hit => hit || networkFirst(req)));
    }
    return;
  }
  if (url.hostname === 'tiles.openfreemap.org') {
    // style JSON: network-first (it points at the current tile build); tiles/fonts/sprites: cache-first
    if (url.pathname.startsWith('/styles/') || url.pathname === '/planet') { e.respondWith(fetch(req).then(res => { if (res.ok) { const cl = res.clone(); caches.open(RUNTIME_CACHE).then(c => c.put(req, cl)); } return res; }).catch(() => caches.open(RUNTIME_CACHE).then(c => c.match(req)).then(h => h || new Response('', {status: 504})))); return; }
    e.respondWith(cacheFirst(req, TILE_CACHE, MAX_TILES).catch(() => new Response('', {status: 504})));
    return;
  }
  if (/(^|\.)tile\.openstreetmap\.org$/.test(url.hostname)) {
    e.respondWith(cacheFirst(req, TILE_CACHE, MAX_TILES).catch(() => new Response('', {status: 504})));
    return;
  }
  if (url.hostname === 'unpkg.com' || url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(cacheFirst(req, RUNTIME_CACHE, MAX_RUNTIME));
  }
});
