/* sw.js — service worker لحائط الخير (نطاق charity-wall/)
   app-shell precache + network-first للشيفرة + cache-first للأصول المحلية.
   المكتبات (three.js / gsap) محلية في vendor/ حتى يعمل الحائط دون اتصال. */

const CACHE = 'charity-wall-v20261127-dbfix';
const CORE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './firebase-config.js',
  './firebase-service.js',
  './wall-3d.js',
  './animations.js',
  './sounds.js',
  './donors.js',
  './expenses.js',
  './vendor/three.module.js',
  './vendor/gsap.min.js',
  './manifest.json',
  './assets/sounds/manifest.json',
  './assets/textures/brick_wall.jpg',
  './assets/textures/brick_wall_bump.jpg',
  './assets/textures/concrete.jpg',
  './assets/textures/concrete_bump.jpg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-192-maskable.png',
  './assets/icons/icon-512-maskable.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; /* Firestore/Auth يديره SDK بنفسه */

  /* التنقل: network-first مع fallback للكاش */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  /* الشيفرة والبيانات: network-first حتى تصلك التحديثات فورًا */
  if (/\.(js|css|html|json)(\?|$)/.test(url.pathname)) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(c => c || Response.error()))
    );
    return;
  }

  /* أصول ثابتة (أيقونات): stale-while-revalidate */
  e.respondWith(
    caches.match(req).then(cached => {
      const fetcher = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fetcher;
    })
  );
});
