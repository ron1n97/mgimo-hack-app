/* PWA shell + Web Push (ADR 0013). Cache policy: apps/web/src/lib/sw-cache-policy.mjs */
const CACHE = "dekanat-web-v3";

function isCacheableAsset(requestUrl) {
  try {
    const url = new URL(requestUrl);
    if (url.origin !== self.location.origin) return false;
    const pathname = url.pathname;
    if (pathname.startsWith("/_next/static/")) return true;
    if (pathname.startsWith("/icons/")) return true;
    if (pathname === "/manifest.webmanifest") return true;
    return false;
  } catch {
    return false;
  }
}

function shouldPutInCache(request, response) {
  if (request.method !== "GET") return false;
  if (!isCacheableAsset(request.url)) return false;
  return response.ok;
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  // Never intercept API / HTML / RSC — browser talks to network with Authorization.
  // Old v2 SW cache-first'd API 401s and bounced logged-in users to /.
  if (!isCacheableAsset(request.url)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (shouldPutInCache(request, response)) {
        cache.put(request, response.clone());
      }
      return response;
    }),
  );
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Деканат+",
    body: "Новое уведомление",
    url: "/notifications",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        title: parsed.title || data.title,
        body: parsed.body || data.body,
        url: parsed.url || data.url,
        kind: parsed.kind,
        notificationId: parsed.notificationId,
      };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url, kind: data.kind, notificationId: data.notificationId },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || "/notifications";
  const path = typeof target === "string" ? target : "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(path);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(path);
      }
      return undefined;
    }),
  );
});
