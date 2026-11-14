/**
 * Service worker cache policy (source of truth for tests).
 * Keep apps/web/public/sw.js in sync with these rules.
 *
 * Bug we prevent: cache-first for API GETs stores 401s (no Authorization in
 * cache key). After login, /clubs etc. hit stale 401 → client clearSession →
 * bounce to login.
 */

/** @param {string} requestUrl @param {string} swOrigin */
export function isSameOrigin(requestUrl, swOrigin) {
  try {
    return new URL(requestUrl).origin === new URL(swOrigin).origin;
  } catch {
    return false;
  }
}

/**
 * Only same-origin static assets may be cached. Never HTML shells, RSC,
 * or cross-origin API (JWT Bearer responses).
 * @param {string} requestUrl
 * @param {string} swOrigin
 */
export function isCacheableAsset(requestUrl, swOrigin) {
  if (!isSameOrigin(requestUrl, swOrigin)) return false;
  let pathname;
  try {
    pathname = new URL(requestUrl).pathname;
  } catch {
    return false;
  }
  if (pathname.startsWith("/_next/static/")) return true;
  if (pathname.startsWith("/icons/")) return true;
  if (pathname === "/manifest.webmanifest") return true;
  return false;
}

/**
 * @param {{ method?: string, url: string }} request
 * @param {{ ok?: boolean, status?: number }} response
 * @param {string} swOrigin
 */
export function shouldPutInCache(request, response, swOrigin) {
  if ((request.method ?? "GET").toUpperCase() !== "GET") return false;
  if (!isCacheableAsset(request.url, swOrigin)) return false;
  const status = response.status ?? (response.ok ? 200 : 0);
  return status >= 200 && status < 300;
}

/**
 * If false, SW must not call respondWith (browser default / network).
 * @param {{ method?: string, url: string }} request
 * @param {string} swOrigin
 */
export function shouldInterceptGet(request, swOrigin) {
  if ((request.method ?? "GET").toUpperCase() !== "GET") return false;
  return isCacheableAsset(request.url, swOrigin);
}
