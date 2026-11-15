/**
 * Split club digest items into "today" and "this week" using Moscow calendar days.
 * Keep in sync with apps/api/src/today/today-digest.ts.
 */

export function moscowDateString(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function moscowDateStringOf(isoOrDate: string | Date): string {
  return moscowDateString(
    typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate,
  );
}

/** Monday–Sunday week bounds in Moscow calendar days (YYYY-MM-DD). */
export function moscowWeekBounds(day = moscowDateString()): {
  from: string;
  to: string;
} {
  const [y, m, d] = day.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 9, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    weekday: "short",
  }).format(noonUtc);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = map[weekday] ?? 0;
  const monday = new Date(noonUtc);
  monday.setUTCDate(monday.getUTCDate() - offset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    from: moscowDateString(monday),
    to: moscowDateString(sunday),
  };
}

export type DigestFeedLike = { startsAt?: string | null };

export function splitDigestFeed<T extends DigestFeedLike>(
  items: T[],
  day = moscowDateString(),
): { today: T[]; week: T[] } {
  const { from, to } = moscowWeekBounds(day);
  const today: T[] = [];
  const week: T[] = [];
  for (const item of items) {
    if (!item.startsAt) continue;
    const evDay = moscowDateStringOf(item.startsAt);
    if (evDay === day) today.push(item);
    if (evDay >= from && evDay <= to) week.push(item);
  }
  return { today, week };
}
