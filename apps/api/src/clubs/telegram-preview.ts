/**
 * Parse public Telegram channel preview pages (https://t.me/s/<username>).
 * No Bot API token required — HTML widget scrape only.
 */

export type TelegramPreviewPost = {
  /** channel/msgId — stable id from data-post */
  postId: string;
  url: string;
  publishedAt: Date;
  /** Event/meeting time if parsed from text; else null. */
  eventAt: Date | null;
  title: string;
  /** Short plain description for cards (not full post). */
  body: string;
  text: string;
  imageUrl: string | null;
};

const ENTITY: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

const MONTHS: Record<string, number> = {
  января: 1,
  февраля: 2,
  марта: 3,
  апреля: 4,
  мая: 5,
  июня: 6,
  июля: 7,
  августа: 8,
  сентября: 9,
  октября: 10,
  ноября: 11,
  декабря: 12,
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

function isNoiseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^#[\wа-яё]+(\s+#[\wа-яё]+)*$/i.test(t)) return true;
  if (/^(на связи|подписывайтесь|жми|подробнее)/i.test(t)) return true;
  // emoji / symbol only
  if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s⚡🔥👉➡️🔗🍁🎾😍❤️]+$/u.test(t)) {
    return true;
  }
  return false;
}

function cleanLine(line: string): string {
  return line
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s⚡🔥👉➡️🔗🍁🎾😍❤️«»]+/u, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}⚡🔥👉➡️🔗🍁🎾😍❤️]+$/u, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Title + short body for digest cards. */
export function titleAndBodyFromText(text: string): { title: string; body: string } {
  const lines = text
    .split(/\n+/)
    .map((l) => cleanLine(l))
    .filter((l) => !isNoiseLine(l));

  const title = (lines[0] ?? 'Анонс').slice(0, 100);
  const body = lines
    .slice(1)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 280);
  return { title, body };
}

/** First channel photo URL in a message chunk (skip emoji / tiny icons). */
export function extractImageUrl(chunk: string): string | null {
  const photoWrap = /tgme_widget_message_photo_wrap[^>]*style="([^"]*)"/i.exec(
    chunk,
  );
  if (photoWrap) {
    const url = /background-image:url\('([^']+)'\)/i.exec(photoWrap[1])?.[1];
    if (url && /telesco\.pe|cdn\d*\.telegram/i.test(url)) return url;
  }
  const videoThumb =
    /tgme_widget_message_video_thumb[^>]*style="([^"]*)"/i.exec(chunk);
  if (videoThumb) {
    const url = /background-image:url\('([^']+)'\)/i.exec(videoThumb[1])?.[1];
    if (url && /telesco\.pe|cdn\d*\.telegram/i.test(url)) return url;
  }
  return null;
}

function mskParts(d: Date): { y: number; m: number; day: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, m, day] = fmt.format(d).split('-').map(Number);
  return { y, m, day };
}

/** Interpret civil MSK date/time as UTC Date. Date-only → 00:00 MSK. */
export function mskDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  return new Date(
    Date.UTC(year, month - 1, day, hour - 3, minute, 0),
  );
}

function isValidDayMonth(day: number, month: number): boolean {
  return (
    Number.isInteger(day) &&
    Number.isInteger(month) &&
    day >= 1 &&
    day <= 31 &&
    month >= 1 &&
    month <= 12
  );
}

/**
 * Bump year only for Dec→Jan style wrap (late publish, early event month),
 * not for same-month recap dates that are simply in the past.
 */
function resolveYear(
  pub: { y: number; m: number },
  month: number,
  explicitYear: number | null,
): number {
  if (explicitYear != null) return explicitYear;
  if (pub.m >= 11 && month <= 2) return pub.y + 1;
  return pub.y;
}

/**
 * Pull event/meeting datetime from Russian club-post text.
 * Falls back to null when nothing reliable is found.
 */
export function extractEventAt(
  text: string,
  publishedAt: Date,
): Date | null {
  const pub = mskParts(publishedAt);
  const lower = text.toLowerCase().replace(/\s+/g, ' ');

  // Optional clock after a date token: "в 16:00" / "16:00" / "16.00".
  const timeTail = '(?:\\s*(?:в|во)?\\s+(\\d{1,2})[:.](\\d{2}))?';

  const precededByVo = (index: number): boolean =>
    /(?:в|во)\s+$/.test(lower.slice(Math.max(0, index - 4), index));

  const withMonthTime = new RegExp(
    `(\\d{1,2})\\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\\s+(\\d{4}))?${timeTail}`,
    'i',
  ).exec(lower);
  if (withMonthTime) {
    const day = Number(withMonthTime[1]);
    const month = MONTHS[withMonthTime[2].toLowerCase()];
    if (!isValidDayMonth(day, month)) return null;
    const year = resolveYear(
      pub,
      month,
      withMonthTime[3] ? Number(withMonthTime[3]) : null,
    );
    const hour = withMonthTime[4] ? Number(withMonthTime[4]) : 0;
    const minute = withMonthTime[5] ? Number(withMonthTime[5]) : 0;
    return mskDateTimeToUtc(year, month, day, hour, minute);
  }

  // Word-boundary relative days (avoid сегодняшний / послезавтра).
  const relative = new RegExp(
    `(?:^|[^\\p{L}])(сегодня|завтра)(?=[^\\p{L}]|$)${timeTail}`,
    'u',
  ).exec(lower);
  if (relative) {
    const offset = relative[1] === 'завтра' ? 1 : 0;
    const civil = new Date(Date.UTC(pub.y, pub.m - 1, pub.day + offset));
    const hour = relative[2] ? Number(relative[2]) : 0;
    const minute = relative[3] ? Number(relative[3]) : 0;
    return mskDateTimeToUtc(
      civil.getUTCFullYear(),
      civil.getUTCMonth() + 1,
      civil.getUTCDate(),
      hour,
      minute,
    );
  }

  const numericWithYear = new RegExp(
    `(\\d{1,2})[./](\\d{1,2})[./](\\d{2,4})${timeTail}`,
  ).exec(lower);
  if (numericWithYear) {
    const day = Number(numericWithYear[1]);
    const month = Number(numericWithYear[2]);
    if (!isValidDayMonth(day, month)) return null;
    const year = Number(
      numericWithYear[3].length === 2
        ? `20${numericWithYear[3]}`
        : numericWithYear[3],
    );
    const hour = numericWithYear[4] ? Number(numericWithYear[4]) : 0;
    const minute = numericWithYear[5] ? Number(numericWithYear[5]) : 0;
    return mskDateTimeToUtc(year, month, day, hour, minute);
  }

  // dd/mm or dd.mm without year. Skip "в 18.00" clocks; bare "18.00" fails month check.
  const shortRe = new RegExp(
    `(\\d{1,2})([./])(\\d{1,2})(?!\\.\\d)(?!\\d)${timeTail}`,
    'g',
  );
  let shortMatch: RegExpExecArray | null;
  while ((shortMatch = shortRe.exec(lower)) !== null) {
    if (precededByVo(shortMatch.index)) continue;
    const day = Number(shortMatch[1]);
    const month = Number(shortMatch[3]);
    if (!isValidDayMonth(day, month)) continue;
    const year = resolveYear(pub, month, null);
    const hour = shortMatch[4] ? Number(shortMatch[4]) : 0;
    const minute = shortMatch[5] ? Number(shortMatch[5]) : 0;
    return mskDateTimeToUtc(year, month, day, hour, minute);
  }

  return null;
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
    if (Number.isNaN(publishedAt.getTime())) continue;
    const text = stripHtml(textHtml);
    const imageUrl = extractImageUrl(chunk);
    if (!text && !imageUrl) continue;
    const { title, body } = titleAndBodyFromText(
      text || 'Фото-анонс в канале',
    );
    const eventAt = text ? extractEventAt(text, publishedAt) : null;
    posts.push({
      postId,
      url: `https://t.me/${postId}`,
      publishedAt,
      eventAt,
      title,
      body,
      text: text || title,
      imageUrl,
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
