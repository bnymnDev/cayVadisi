// Service Worker — v20.1: Netz-zuerst für Code, Cache-zuerst für große Assets.
// Warum: Der alte Cache-zuerst-Ansatz mischte nach einem Update alte und neue
// JS-Dateien (der Cache füllt sich „on demand") — das Spiel hing dann bei 0 %.
// Jetzt kommt Code (js/html/css) immer frisch vom Server, solange man online
// ist; nur offline greift der Cache. Modelle/Texturen bleiben Cache-zuerst.
const CACHE = 'cayvadisi-v30-0';

const CORE = [
  './',
  './index.html',
  './css/style.css',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isCode(url) {
  return url.pathname.endsWith('.js') || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.html') || url.pathname.endsWith('.json')
    || url.pathname.endsWith('/');
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   // nur eigene Dateien
  if (url.pathname.endsWith('.php')) return;    // v18: Cloud-Save nie cachen
  if (e.request.method !== 'GET') return;

  if (e.request.mode === 'navigate' || isCode(url)) {
    // Netz-zuerst: immer konsistenter Code; offline fällt der Cache ein.
    // v25.6: cache:'no-cache' — sonst bedient der HTTP-Cache des Browsers
    // die SW-Anfrage mit alten Dateien und Updates kommen nie an (S24: nach
    // dem Deploy lief weiter das alte CSS).
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' }).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets (Modelle, Texturen, GLBs): Cache-zuerst — groß und stabil
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
