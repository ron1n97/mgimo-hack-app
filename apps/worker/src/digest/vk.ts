/**
 * VK wall helpers for digest ingest (service token). ADR 0016.
 * No Telegram channel scrape — product bot cancelled.
 */

export type VkWallPost = {
  id: number;
  owner_id: number;
  date: number;
  text?: string;
  is_pinned?: number;
};

export type VkWallGetResponse = {
  response?: {
    count: number;
    items: VkWallPost[];
  };
  error?: { error_code: number; error_msg: string };
};

/** Extract VK screen name / domain from a club source URL. */
export function parseVkDomain(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (
      !u.hostname.includes('vk.com') &&
      !u.hostname.includes('vkontakte.ru')
    ) {
      return null;
    }
    const parts = u.pathname.split('/').filter(Boolean);
    if (!parts.length) return null;
    const raw = parts[0].split('?')[0];
    if (!raw || raw === 'wall' || raw === 'write') return null;
    return raw;
  } catch {
    return null;
  }
}

export function vkPostUrl(ownerId: number, postId: number): string {
  return `https://vk.com/wall${ownerId}_${postId}`;
}

export function mapVkPostToCandidate(post: VkWallPost): {
  title: string;
  body: string;
  url: string;
  startsAt: Date;
  externalKey: string;
} {
  const text = (post.text ?? '').trim();
  const firstLine =
    text.split('\n').map((l) => l.trim()).find(Boolean) ?? 'Пост VK';
  const title =
    firstLine.length > 120 ? `${firstLine.slice(0, 117)}…` : firstLine;
  return {
    title,
    body: text.slice(0, 2000) || title,
    url: vkPostUrl(post.owner_id, post.id),
    startsAt: new Date(post.date * 1000),
    externalKey: `vk:${post.owner_id}_${post.id}`,
  };
}

export type FetchVkWallOpts = {
  domain: string;
  accessToken: string;
  count?: number;
  apiVersion?: string;
  fetchImpl?: typeof fetch;
};

export async function fetchVkWall(
  opts: FetchVkWallOpts,
): Promise<{ posts: VkWallPost[]; error?: string }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams({
    domain: opts.domain,
    count: String(opts.count ?? 10),
    access_token: opts.accessToken,
    v: opts.apiVersion ?? '5.199',
    filter: 'owner',
  });
  const res = await fetchImpl(
    `https://api.vk.com/method/wall.get?${params.toString()}`,
  );
  if (!res.ok) {
    return { posts: [], error: `HTTP ${res.status}` };
  }
  const json = (await res.json()) as VkWallGetResponse;
  if (json.error) {
    return {
      posts: [],
      error: `${json.error.error_code}: ${json.error.error_msg}`,
    };
  }
  const items = json.response?.items ?? [];
  return {
    posts: items.filter((p) => !p.is_pinned || (p.text && p.text.trim())),
  };
}
