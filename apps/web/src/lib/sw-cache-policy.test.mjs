import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isCacheableAsset,
  isSameOrigin,
  shouldInterceptGet,
  shouldPutInCache,
} from "./sw-cache-policy.mjs";

const ORIGIN = "https://dekanat.177.177.212.34.sslip.io";
const API = "https://api.dekanat.177.177.212.34.sslip.io";

test("same-origin detects API subdomain as cross-origin", () => {
  assert.equal(isSameOrigin(`${API}/clubs`, ORIGIN), false);
  assert.equal(isSameOrigin(`${ORIGIN}/today`, ORIGIN), true);
});

test("API URLs are never cacheable assets", () => {
  assert.equal(isCacheableAsset(`${API}/auth/me`, ORIGIN), false);
  assert.equal(isCacheableAsset(`${API}/clubs`, ORIGIN), false);
  assert.equal(isCacheableAsset(`${API}/digest/feed?filter=subscribed`, ORIGIN), false);
});

test("HTML shells and RSC are not cacheable", () => {
  assert.equal(isCacheableAsset(`${ORIGIN}/`, ORIGIN), false);
  assert.equal(isCacheableAsset(`${ORIGIN}/today`, ORIGIN), false);
  assert.equal(isCacheableAsset(`${ORIGIN}/clubs`, ORIGIN), false);
  assert.equal(isCacheableAsset(`${ORIGIN}/clubs?_rsc=abc`, ORIGIN), false);
});

test("hashed Next static and icons are cacheable", () => {
  assert.equal(
    isCacheableAsset(`${ORIGIN}/_next/static/chunks/app/page-abc.js`, ORIGIN),
    true,
  );
  assert.equal(isCacheableAsset(`${ORIGIN}/icons/icon-192.png`, ORIGIN), true);
  assert.equal(isCacheableAsset(`${ORIGIN}/manifest.webmanifest`, ORIGIN), true);
});

test("shouldPutInCache rejects API 401 poison", () => {
  assert.equal(
    shouldPutInCache(
      { method: "GET", url: `${API}/clubs` },
      { status: 401 },
      ORIGIN,
    ),
    false,
  );
  assert.equal(
    shouldPutInCache(
      { method: "GET", url: `${API}/auth/me` },
      { status: 401 },
      ORIGIN,
    ),
    false,
  );
});

test("shouldPutInCache allows only successful static assets", () => {
  const asset = `${ORIGIN}/_next/static/chunks/main.js`;
  assert.equal(
    shouldPutInCache({ method: "GET", url: asset }, { status: 200 }, ORIGIN),
    true,
  );
  assert.equal(
    shouldPutInCache({ method: "GET", url: asset }, { status: 404 }, ORIGIN),
    false,
  );
  assert.equal(
    shouldPutInCache({ method: "POST", url: asset }, { status: 200 }, ORIGIN),
    false,
  );
});

test("SW intercepts only cacheable same-origin GETs", () => {
  assert.equal(
    shouldInterceptGet({ method: "GET", url: `${API}/clubs` }, ORIGIN),
    false,
  );
  assert.equal(
    shouldInterceptGet({ method: "GET", url: `${ORIGIN}/clubs` }, ORIGIN),
    false,
  );
  assert.equal(
    shouldInterceptGet(
      { method: "GET", url: `${ORIGIN}/icons/icon-192.png` },
      ORIGIN,
    ),
    true,
  );
});
