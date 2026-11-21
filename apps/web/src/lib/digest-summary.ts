/** Compact digest card fields — no full post body. */

export type DigestLike = {
  title: string;
  body?: string | null;
  url?: string | null;
  startsAt?: string | null;
  publishedAt?: string | null;
  club?: { id?: string; name: string } | null;
};

export type DigestSummary = {
  day: string | null;
  time: string | null;
  club: string | null;
  title: string;
  registrationUrl: string | null;
  postUrl: string | null;
};

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

const REG_HINT =
  /регистр|запис[ьи]|заявк|forms\.gle|docs\.google|bit\.ly|clck\.ru|vk\.com\/app|t\.me\/\+|timepad|afisha/i;

function stripTrailingPunct(url: string): string {
  return url.replace(/[.,;:!?)]+$/g, "");
}

function extractUrls(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(URL_RE);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(stripTrailingPunct(m[0]));
  }
  return out;
}

function pickRegistrationUrl(
  body: string | null | undefined,
  postUrl: string | null,
): string | null {
  if (!body) return null;
  const urls = extractUrls(body);
  if (urls.length === 0) return null;

  const preferred = urls.find(
    (u) => u !== postUrl && REG_HINT.test(u),
  );
  if (preferred) return preferred;

  // URL near «регистрац…» in text
  const near = /(?:регистрац\w*|запис\w*|заявк\w*)[^\n]{0,80}(https?:\/\/[^\s<>"')\]]+)/i.exec(
    body,
  );
  if (near?.[1]) {
    const u = stripTrailingPunct(near[1]);
    if (u !== postUrl) return u;
  }

  const other = urls.find((u) => u !== postUrl);
  return other && REG_HINT.test(body) ? other : null;
}

function mskDayTime(iso: string): { day: string; time: string | null } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: iso.slice(0, 10), time: null };
  const day = d.toLocaleDateString("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = d.toLocaleTimeString("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  });
  // Date-only seeds land at 00:00 MSK — hide fake midnight.
  return { day, time: time === "00:00" ? null : time };
}

/** Pull day/time hints from post text when startsAt is missing. */
function parseWhenFromBody(body: string | null | undefined): {
  day: string | null;
  time: string | null;
} {
  if (!body) return { day: null, time: null };
  const timeM =
    /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/.exec(body) ??
    /\bв\s+(\d{1,2})\s*[:.]\s*(\d{2})\b/i.exec(body);
  const time = timeM ? `${timeM[1].padStart(2, "0")}:${timeM[2]}` : null;

  const dayM =
    /(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/i.exec(
      body,
    ) ??
    /(сегодня|завтра|понедельник|вторник|среда|среду|четверг|пятниц[ау]|суббот[ау]|воскресень[ея])/i.exec(
      body,
    );
  const day = dayM ? dayM[0] : null;
  return { day, time };
}

export function summarizeDigestItem(item: DigestLike): DigestSummary {
  const postUrl = item.url?.trim() || null;
  const fromStart = item.startsAt ? mskDayTime(item.startsAt) : null;
  const fromPub =
    !item.startsAt && item.publishedAt ? mskDayTime(item.publishedAt) : null;
  const fromBody = parseWhenFromBody(item.body);
  return {
    day: fromStart?.day ?? fromBody.day ?? fromPub?.day ?? null,
    time: fromStart?.time ?? fromBody.time ?? null,
    club: item.club?.name?.trim() || null,
    title: item.title.trim() || "Анонс",
    registrationUrl: pickRegistrationUrl(item.body, postUrl),
    postUrl,
  };
}
