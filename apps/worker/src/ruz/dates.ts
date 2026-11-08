/** Format Date as RUZ expects: YYYY.MM.DD */
export function formatRuzDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** Monday 00:00 of the week containing `ref` (local). */
export function startOfWeek(ref: Date = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Current week Mon–Sun + next week Mon–Sun */
export function currentAndNextWeekRange(ref: Date = new Date()): {
  start: Date;
  finish: Date;
  startStr: string;
  finishStr: string;
} {
  const start = startOfWeek(ref);
  const finish = new Date(start);
  finish.setDate(finish.getDate() + 13); // Mon + 13 days = next Sun
  return {
    start,
    finish,
    startStr: formatRuzDate(start),
    finishStr: formatRuzDate(finish),
  };
}

/** Parse RUZ date "YYYY.MM.DD" or "YYYY-MM-DD" → Date at UTC midnight */
export function parseRuzDate(value: string): Date {
  const normalized = value.includes('.')
    ? value.replace(/\./g, '-')
    : value.slice(0, 10);
  const [y, m, d] = normalized.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
