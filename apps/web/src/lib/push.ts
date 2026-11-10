import {
  fetchVapidPublicKey,
  subscribePush,
  unsubscribePush,
} from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export type PushEnableResult =
  | { ok: true; endpoint: string }
  | { ok: false; reason: string };

/** Request permission (if needed), subscribe, and persist on API. */
export async function enableWebPush(): Promise<PushEnableResult> {
  if (!pushSupported()) {
    return { ok: false, reason: "unsupported" };
  }

  const registration = await ensureServiceWorker();
  if (!registration) {
    return { ok: false, reason: "no_sw" };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  const { publicKey } = await fetchVapidPublicKey();
  if (!publicKey) {
    return { ok: false, reason: "no_vapid" };
  }

  const envKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const applicationServerKey = urlBase64ToUint8Array(envKey || publicKey);

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "bad_subscription" };
  }

  await subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  });

  return { ok: true, endpoint: json.endpoint };
}

/** Best-effort: if permission already granted, sync subscription after login. */
export async function syncWebPushAfterLogin(): Promise<void> {
  if (!pushSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    await enableWebPush();
  } catch {
    /* non-blocking */
  }
}

export async function disableWebPush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  try {
    await unsubscribePush(endpoint);
  } catch {
    /* ignore API errors */
  }
  await subscription.unsubscribe();
}
