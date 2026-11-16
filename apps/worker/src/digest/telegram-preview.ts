/**
 * Parse public Telegram channel preview pages (https://t.me/s/<username>).
 * No Bot API token required — HTML widget scrape only.
 * Keep in sync with apps/api/src/clubs/telegram-preview.ts.
 */

export type TelegramPreviewPost = {
  /** channel/msgId — stable id from data-post */
  postId: string;
  url: string;
  publishedAt: Date;
  title: string;
  body: string;
  text: string;
};

const ENTITY: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITY[name.toLowerCase()] ?? m);
}

export function stripHtml(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** https://t.me/sskmgimo → sskmgimo; ignores /s/ and message ids. */
export function telegramUsernameFromUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!/(^|\.)t\.me$/i.test(u.hostname) && !/(^|\.)telegram\.me$/i.test(u.hostname)) {
      return null;
    }
    const parts = u.pathname.split('/').filter(Boolean);
    if (!parts.length) return null;
    if (parts[0] === 's' || parts[0] === 'c') {
      return parts[1] ? parts[1].replace(/^@/, '') : null;
    }
    if (['joinchat', 'addstickers', 'share', 'proxy'].includes(parts[0].toLowerCase())) {
      return null;
    }
    return parts[0].replace(/^@/, '') || null;
  } catch {
    return null;
  }
}

export function telegramPreviewUrl(usernameOrUrl: string): string | null {
  const raw = usernameOrUrl.trim();
  const username = raw.includes('/')
    ? telegramUsernameFromUrl(raw)
    : raw.replace(/^@/, '');
  if (!username || !/^[A-Za-z0-9_]{4,64}$/.test(username)) return null;
  return `https://t.me/s/${username}`;
}

export function titleAndBodyFromText(text: string): { title: string; body: string } {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const title = (lines[0] ?? 'Пост').slice(0, 140);
  const body = lines.slice(1).join('\n').slice(0, 2000);
  return { title, body };
}

/**
 * Extract posts from t.me/s HTML via data-post anchors (stable vs widget class churn).
 */
export function parseTelegramPreviewHtml(html: string): TelegramPreviewPost[] {
  const posts: TelegramPreviewPost[] = [];
  const re = /data-post="([^"]+)"/g;
  let match: RegExpExecArray | null;
  const starts: Array<{ postId: string; index: number }> = [];
  while ((match = re.exec(html)) !== null) {
    starts.push({ postId: match[1], index: match.index });
  }

  for (let i = 0; i < starts.length; i += 1) {
    const { postId, index } = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : html.length;
    const chunk = html.slice(index, end);
    const datetime = /datetime="([^"]+)"/.exec(chunk)?.[1];
    const textHtml =
      /tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/.exec(chunk)?.[1] ?? '';
    if (!datetime) continue;
    const publishedAt = new Date(datetime);
    const text = stripHtml(textHtml);
    if (Number.isNaN(publishedAt.getTime()) || !text) continue;
    const { title, body } = titleAndBodyFromText(text);
    posts.push({
      postId,
      url: `https://t.me/${postId}`,
      publishedAt,
      title,
      body,
      text,
    });
  }

  const seen = new Set<string>();
  const out: TelegramPreviewPost[] = [];
  for (const p of posts) {
    if (seen.has(p.postId)) continue;
    seen.add(p.postId);
    out.push(p);
  }
  return out.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
}
