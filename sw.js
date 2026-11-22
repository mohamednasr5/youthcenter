/* sw.js — service worker لمركز شباب الأحمدية
   caching: app-shell precache + stale-while-revalidate للأصول + network-first للتنقل */
const CACHE = "ahmadiah-v12";
const CORE = [
  "./", "./index.html", "./article.html", "./admin.html",
  "./styles.css", "./admin.css",
  "./data.js", "./fb-post.js", "./app.js", "./live.js", "./live.css", "./platform-nav.js", "./fx.js", "./fx.css", "./yc-auth-config.js", "./article.js", "./admin.js",
  "./manifest.json", "./robots.txt", "./sitemap.xml", "./llms.txt",
  "./assets/logo.png", "./assets/favicon.png", "./assets/center-photo.jpg", "./assets/og-image.jpg",
  "./assets/icons/icon-192.png", "./assets/icons/icon-512.png",
  "./assets/icons/icon-192-maskable.png", "./assets/icons/icon-512-maskable.png", "./assets/icons/apple-touch-icon.png",
  "./gallery/gallery-manifest.json",
  "./gallery/01.jpg", "./gallery/02.jpg", "./gallery/03.jpg", "./gallery/04.jpg", "./gallery/05.jpg", "./gallery/06.jpg"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // تجاهل الطلبات الخارجية (خطوط جوجل مثلاً)
  if (url.origin !== self.location.origin) return;

  // طلبات التنقل (صفحات): network-first مع fallback للكاش
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // fb-post.json (آخر منشور على فيسبوك المُحدّث تلقائياً): network-first دائماً
  if (url.pathname.endsWith("fb-post.json")) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // الشيفرة والصفحات (js/css/html/json): network-first حتى تصل التحديثات فوراً، مع fallback للكاش دون اتصال
  if (/\.(js|css|html|json)(\?|$)/.test(url.pathname)) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(cached => cached || Response.error()))
    );
    return;
  }

  // الأصول الثابتة (صور وخطوط): stale-while-revalidate
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
