/**
 * Digest UI must link to a concrete post/event, not a bare channel/club homepage.
 */

function stripFrag(url: string): string {
  return url.split('#')[0] ?? url;
}

export function isBareSocialChannel(url: string): boolean {
  const u = stripFrag(url.trim());
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    if (host === 't.me' || host === 'telegram.me') {
      // /user or /c/id without message id
      const parts = path.split('/').filter(Boolean);
      if (parts.length === 1) return true;
      if (parts[0] === 'c' && parts.length === 2) return true;
      return false;
    }
    if (host === 'vk.com' || host === 'm.vk.com') {
      if (path === '/' || path === '') return true;
      if (/wall-?\d+_\d+/i.test(path) || /[?&]w=wall/i.test(parsed.search)) {
        return false;
      }
      // /club123 /public123 /username without wall
      if (/^\/(club|public)\d+$/i.test(path)) return true;
      if (/^\/[\w.-]+$/i.test(path)) return true;
      return false;
    }
  } catch {
    return false;
  }
  return false;
}

/** Real post/event page — never bare TG/VK channel, never synthetic #seed/#demo stubs. */
export function isPostOrEventUrl(url: string | null | undefined): boolean {
  const u = url?.trim();
  if (!u) return false;
  // Seed invented message ids look like posts but 404 — do not link them.
  if (/#(seed|demo)\//i.test(u)) return false;
  if (!/^https?:\/\//i.test(u)) return false;
  if (isBareSocialChannel(u)) return false;
  return true;
}

/** Prefer stored event URL when it is post/event-like; never promote bare channels. */
export function resolveDigestEventUrl(input: {
  url?: string | null;
  sourceUrl?: string | null;
  clubSourceUrls?: Array<string | null | undefined>;
}): string | null {
  if (isPostOrEventUrl(input.url)) return input.url!.trim();
  if (isPostOrEventUrl(input.sourceUrl)) return input.sourceUrl!.trim();
  for (const raw of input.clubSourceUrls ?? []) {
    if (isPostOrEventUrl(raw)) return raw!.trim();
  }
  return null;
}
