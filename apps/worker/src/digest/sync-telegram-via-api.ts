/**
 * Ask API to scrape public t.me/s previews (worker has no Nest/ClubsService).
 * Requires DIGEST_INGEST_KEY on both sides + API_URL reachable from worker.
 */

export type DigestSyncHttpResult = {
  skipped: boolean;
  reason?: string;
  status?: number;
  body?: unknown;
};

export async function syncTelegramDigestViaApi(
  opts: {
    apiUrl?: string;
    ingestKey?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<DigestSyncHttpResult> {
  const apiUrl = (opts.apiUrl ?? process.env.API_URL ?? '').replace(/\/$/, '');
  const ingestKey = opts.ingestKey ?? process.env.DIGEST_INGEST_KEY ?? '';
  const fetchImpl = opts.fetchImpl ?? fetch;

  if (!apiUrl) {
    return { skipped: true, reason: 'API_URL missing' };
  }
  if (!ingestKey) {
    return { skipped: true, reason: 'DIGEST_INGEST_KEY missing' };
  }

  const res = await fetchImpl(`${apiUrl}/internal/digest/telegram`, {
    method: 'POST',
    headers: {
      'x-digest-key': ingestKey,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw */
  }
  if (!res.ok) {
    throw new Error(
      `digest ingest HTTP ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`,
    );
  }
  return { skipped: false, status: res.status, body };
}
