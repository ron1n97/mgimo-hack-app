/**
 * Durable digest news seed plan: MSK-week relative EventCandidate stubs
 * with links to club VK/Telegram ClubSource URLs (no live scrape).
 * ADR 0016.
 */
import { moscowDateString, moscowWeekBounds } from '../today/today-digest';

export type DigestNewsClubLike = {
  id: string;
  name: string;
  sources: Array<{ id: string; kind: string; url: string; enabled?: boolean }>;
};

export type DigestNewsFeedItem = {
  /** Stable seed key — used as EventCandidate.title prefix for idempotent upsert. */
  seedKey: string;
  title: string;
  body: string;
  /** Offset from Monday of the current Moscow week (0=Mon … 6=Sun). */
  dayOffsetFromMonday: number;
  /** Moscow local hour (0–23); stored as UTC instant (MSK = UTC+3 winter). */
  hourMsk: number;
  preferKind: 'VK' | 'TELEGRAM' | 'ANY';
  /** Substring match against club.name (case-insensitive). */
  clubNameIncludes?: string;
};

const TITLE_PREFIX = 'Дайджест:';

/** Canonical news-like stubs for the current Moscow week. */
export function buildDigestNewsFeedPlan(): DigestNewsFeedItem[] {
  return [
    {
      seedKey: 'today-open',
      title: `${TITLE_PREFIX} открытый день клубов`,
      body: 'Анонс на сегодня: короткие встречи и запись в секции. Источник — канал клуба.',
      dayOffsetFromMonday: -1, // resolved relative to "today" below via resolveDayOffset
      hourMsk: 12,
      preferKind: 'ANY',
      clubNameIncludes: 'спортив',
    },
    {
      seedKey: 'week-nso',
      title: `${TITLE_PREFIX} научная среда НСО`,
      body: 'Недельный анонс: доклады и круглый стол. Ссылка ведёт в VK/TG клуба.',
      dayOffsetFromMonday: 2,
      hourMsk: 18,
      preferKind: 'VK',
      clubNameIncludes: 'НСО',
    },
    {
      seedKey: 'week-culture',
      title: `${TITLE_PREFIX} вечер Культурного центра`,
      body: 'Концерт / открытая репетиция на этой неделе. Без live-scrape — seed-лента.',
      dayOffsetFromMonday: 4,
      hourMsk: 19,
      preferKind: 'TELEGRAM',
      clubNameIncludes: 'Культурн',
    },
    {
      seedKey: 'week-studsouz',
      title: `${TITLE_PREFIX} новости Студенческого союза`,
      body: 'Сводка недели: заявки, дедлайны, объявления союза.',
      dayOffsetFromMonday: 5,
      hourMsk: 11,
      preferKind: 'VK',
      clubNameIncludes: 'Студенческий союз',
    },
    {
      seedKey: 'week-ssk',
      title: `${TITLE_PREFIX} тренировка ССК`,
      body: 'Товарищеская тренировка / матч в окне текущей московской недели.',
      dayOffsetFromMonday: 3,
      hourMsk: 17,
      preferKind: 'TELEGRAM',
      clubNameIncludes: 'спортив',
    },
  ];
}

/**
 * Resolve dayOffsetFromMonday: −1 means "today" within the MSK week
 * (clamped Mon–Sun of the week containing `now`).
 */
export function resolveDayOffsetFromMonday(
  planned: number,
  now = new Date(),
): number {
  if (planned >= 0 && planned <= 6) return planned;
  const day = moscowDateString(now);
  const { from } = moscowWeekBounds(day);
  const [y, m, d] = day.split('-').map(Number);
  const [fy, fm, fd] = from.split('-').map(Number);
  const todayNoon = Date.UTC(y, m - 1, d, 9, 0, 0);
  const mondayNoon = Date.UTC(fy, fm - 1, fd, 9, 0, 0);
  const offset = Math.round((todayNoon - mondayNoon) / 86_400_000);
  return Math.min(6, Math.max(0, offset));
}

/** Instant for Moscow calendar day (week Monday + offset) at hourMsk (UTC+3). */
export function moscowWeekInstant(opts: {
  dayOffsetFromMonday: number;
  hourMsk: number;
  now?: Date;
}): Date {
  const now = opts.now ?? new Date();
  const offset = resolveDayOffsetFromMonday(opts.dayOffsetFromMonday, now);
  const { from } = moscowWeekBounds(moscowDateString(now));
  const [y, m, d] = from.split('-').map(Number);
  // MSK = UTC+3 (contest demo; no DST edge needed for seed stubs)
  const utcHour = opts.hourMsk - 3;
  return new Date(Date.UTC(y, m - 1, d + offset, utcHour, 0, 0));
}

export function pickClubSource(
  club: DigestNewsClubLike,
  preferKind: DigestNewsFeedItem['preferKind'],
): { id: string; url: string; kind: string } | null {
  const enabled = club.sources.filter((s) => s.enabled !== false && s.url);
  if (!enabled.length) return null;
  if (preferKind !== 'ANY') {
    const hit = enabled.find((s) => s.kind === preferKind);
    if (hit) return { id: hit.id, url: hit.url, kind: hit.kind };
  }
  const vk = enabled.find((s) => s.kind === 'VK');
  if (vk) return { id: vk.id, url: vk.url, kind: vk.kind };
  const tg = enabled.find((s) => s.kind === 'TELEGRAM');
  if (tg) return { id: tg.id, url: tg.url, kind: tg.kind };
  return { id: enabled[0].id, url: enabled[0].url, kind: enabled[0].kind };
}

export function matchClubForItem(
  clubs: DigestNewsClubLike[],
  item: DigestNewsFeedItem,
): DigestNewsClubLike | null {
  if (item.clubNameIncludes) {
    const needle = item.clubNameIncludes.toLowerCase();
    const hit = clubs.find((c) => c.name.toLowerCase().includes(needle));
    if (hit) return hit;
  }
  return clubs[0] ?? null;
}

export type BuiltDigestNewsRow = {
  seedKey: string;
  title: string;
  body: string;
  startsAt: Date;
  clubId: string;
  sourceId: string | null;
  url: string | null;
};

/** Pure plan → rows bound to concrete clubs/sources. */
export function materializeDigestNewsFeed(
  clubs: DigestNewsClubLike[],
  now = new Date(),
  plan = buildDigestNewsFeedPlan(),
): BuiltDigestNewsRow[] {
  const rows: BuiltDigestNewsRow[] = [];
  for (const item of plan) {
    const club = matchClubForItem(clubs, item);
    if (!club) continue;
    const source = pickClubSource(club, item.preferKind);
    rows.push({
      seedKey: item.seedKey,
      title: item.title,
      body: item.body,
      startsAt: moscowWeekInstant({
        dayOffsetFromMonday: item.dayOffsetFromMonday,
        hourMsk: item.hourMsk,
        now,
      }),
      clubId: club.id,
      sourceId: source?.id ?? null,
      // Unique EventCandidate.url: channel homepage reused across stubs → fragment key.
      url: source ? `${source.url.replace(/#.*$/, '')}#seed/${item.seedKey}` : null,
    });
  }
  return rows;
}

export function isDigestNewsTitle(title: string): boolean {
  return title.startsWith(TITLE_PREFIX);
}
