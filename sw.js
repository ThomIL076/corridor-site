// Corridor PWA service worker — minimal, assets-only, deliberately no HTML/offline handling.
//
// Fix 2026-09-14 (installabilite Chrome/Android) : Chrome n'expose beforeinstallprompt que si un
// service worker actif controle la page avec un handler fetch -- condition bloquante manquante
// jusqu'ici (le seul sw.js existant etait un kill switch qui se desinstalle lui-meme, laisse en
// place depuis le 28/08 suite a un incident reel, cf. commit a9a2e9b). Cause de cet incident :
// l'ancien SW (partage par tous les dashboards, un seul fichier a la racine) precachait
// /demo-private.html en dur et, en cas d'echec reseau sur une navigation, servait TOUJOURS cette
// meme page comme fallback offline -- un client Kaizenology aurait pu voir le dashboard de Thomas
// apres une simple coupure reseau.
//
// Ce SW evite structurellement cette classe de bug : PRECACHE ne contient que des assets
// generiques identiques pour tous les clients (icones, favicon) -- jamais un chemin de page HTML,
// jamais un nom de client. Le handler fetch ne repond depuis le cache QUE pour ces URLs exactes ;
// toute navigation (page HTML), tout appel API, tout manifest par client passe toujours par le
// reseau normalement, sans aucun fallback offline. Une coupure reseau sur autre chose que ces
// quelques assets echoue exactement comme si ce SW n'existait pas.
const CACHE = 'corridor-assets-v1';
const PRECACHE = [
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/corridor-favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!PRECACHE.includes(url.pathname)) return; // everything else: untouched network passthrough
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
