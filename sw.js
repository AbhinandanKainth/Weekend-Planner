/* Weekend Planner service worker: offline support. VERSION is stamped with the commit SHA at deploy time. */
var VERSION = 'wp-__BUILD__';
var CORE = [
  './',
  'index.html',
  'assets/styles.css',
  'assets/i18n.js',
  'assets/app.js',
  'data/cities.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png'
];
// City files are cached individually so one bad file can't break offline mode for every city.
var DATA = [
  'data/hyderabad.js',
  'data/bengaluru.js',
  'data/mumbai.js',
  'data/delhi-ncr.js',
  'data/pune.js'
];
var SLOW_MS = 4000;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(CORE).then(function () {
      return Promise.allSettled(DATA.map(function (u) { return c.add(u); }));
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function fromCache(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return req.mode === 'navigate' ? caches.match('index.html') : undefined;
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Network first for fresh data; fall back to cache when offline or when the network is slow (flaky hostel Wi-Fi).
  var net = fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  });
  e.waitUntil(net.catch(function () {}));
  e.respondWith(new Promise(function (resolve) {
    var done = false;
    function finish(r) { if (!done && r) { done = true; resolve(r); } }
    var timer = setTimeout(function () { fromCache(req).then(finish); }, SLOW_MS);
    net.then(function (res) { clearTimeout(timer); finish(res); }, function () {
      clearTimeout(timer);
      fromCache(req).then(function (hit) { finish(hit || Response.error()); });
    });
  }));
});
