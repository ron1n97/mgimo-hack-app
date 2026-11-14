/** Moscow calendar day as YYYY-MM-DD (en-CA). */
export function moscowDateString(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function moscowDateStringOf(isoOrDate: Date | string): string {
  return moscowDateString(
    typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate,
  );
}

/** Monday–Sunday week bounds in Moscow calendar days (YYYY-MM-DD). */
export function moscowWeekBounds(day = moscowDateString()): {
  from: string;
  to: string;
} {
  const [y, m, d] = day.split('-').map(Number);
  // Noon-ish UTC avoids DST edge when deriving weekday labels for Moscow.
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 9, 0, 0));
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Moscow',
    weekday: 'short',
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

export type DigestEventLike = {
  id: string;
  title: string;
  body?: string | null;
  url?: string | null;
  startsAt?: Date | string | null;
  club?: { id: string; name: string } | null;
};

export function splitClubDigestByDay(
  events: DigestEventLike[],
  day = moscowDateString(),
): { today: DigestEventLike[]; week: DigestEventLike[] } {
  const { from, to } = moscowWeekBounds(day);
  const today: DigestEventLike[] = [];
  const week: DigestEventLike[] = [];
  for (const ev of events) {
    if (!ev.startsAt) continue;
    const evDay = moscowDateStringOf(ev.startsAt);
    if (evDay === day) {
      today.push(ev);
    }
    if (evDay >= from && evDay <= to) {
      week.push(ev);
    }
  }
  return { today, week };
}
