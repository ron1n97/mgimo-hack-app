/**
 * Digest UI must link to a concrete post/event, not a bare channel/club homepage.
 * Channel fallbacks look like links but dump the student into the feed root.
 */

const TG_POST =
  /^https?:\/\/(?:t\.me|telegram\.me)\/(?:c\/\d+\/\d+|[^/?#]+\/\d+)(?:\?[^#]*)?(?:#.*)?$/i;
const VK_POST =
  /^https?:\/\/(?:m\.)?vk\.com\/(?:wall-?\d+_\d+|[\w.-]+\?w=wall-?\d+_\d+)/i;
/** Seed/demo markers that still point at a specific stub row, not the channel root. */
const SEED_FRAGMENT = /#(seed|demo)\//i;

export function isPostOrEventUrl(url: string | null | undefined): boolean {
  const u = url?.trim();
  if (!u) return false;
  if (SEED_FRAGMENT.test(u)) return true;
  if (TG_POST.test(u.split('#')[0] ?? u)) return true;
  if (VK_POST.test(u)) return true;
  return false;
}

/** Prefer stored event URL when it is post-like; never promote bare channel URLs. */
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
  // Bare channel / site homepage is intentionally omitted.
  return null;
}
