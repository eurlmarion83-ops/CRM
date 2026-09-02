// Service worker minimal : rend l'app installable (critère Chrome : un handler "fetch") et
// fournit un secours hors-ligne basique pour la navigation (affiche la coquille de l'app plutôt
// qu'une page d'erreur navigateur). Ne touche pas aux appels API/XHR (agenda, messagerie...) :
// cette application est fortement dynamique, mettre ces réponses en cache ferait plus de mal
// que de bien pour un MVP — seules les requêtes de navigation HTML sont interceptées.
const CACHE_NAME = "medcrm-shell-v1";
const SHELL_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(SHELL_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // laisse passer tout le reste (API, assets...)

  event.respondWith(
    fetch(event.request).catch(() => caches.match(SHELL_URL).then((cached) => cached ?? Response.error()))
  );
});
