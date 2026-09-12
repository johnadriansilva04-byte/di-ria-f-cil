const CACHE_NAME = "caixa-dia-v2";
const PRECACHE = [
  "/manifest.webmanifest",
  "/favicon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Só imagens/manifest entram no cache. Scripts e páginas ficam com a rede,
// para o app nunca mostrar uma versão velha.
const CACHEABLE = /\.(png|jpg|jpeg|svg|webp|ico|woff2?|webmanifest)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Nunca intercepta Supabase nem outras origens
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/auth/v1/") || url.pathname.includes("/rest/v1/")) return;

  // Navegação: rede primeiro; cache apenas como plano B offline
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          void cache.put("/", fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = (await cache.match("/")) ?? (await cache.match(request));
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (!CACHEABLE.test(url.pathname)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") void cache.put(request, response.clone());
      return response;
    })(),
  );
});
