/**
 * Builds a Prisma-friendly date range filter for schedule queries.
 * Inclusive [from, to] on calendar dates (UTC midnight).
 */
export function buildScheduleDateFilter(
  from?: string,
  to?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;

  const filter: { gte?: Date; lte?: Date } = {};

  if (from) {
    const d = parseDateOnly(from);
    if (!d) throw new Error(`Invalid from date: ${from}`);
    filter.gte = d;
  }

  if (to) {
    const d = parseDateOnly(to);
    if (!d) throw new Error(`Invalid to date: ${to}`);
    filter.lte = d;
  }

  if (filter.gte && filter.lte && filter.gte > filter.lte) {
    throw new Error('from must be <= to');
  }

  return filter;
}

export function parseDateOnly(value: string): Date | null {
  // Accept YYYY-MM-DD or YYYY.MM.DD (RUZ style)
  const normalized = value.trim().replace(/\./g, '-');
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

export function isDateInRange(
  date: Date,
  from?: Date,
  to?: Date,
): boolean {
  const t = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  if (from) {
    const f = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    if (t < f) return false;
  }
  if (to) {
    const e = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    if (t > e) return false;
  }
  return true;
}
