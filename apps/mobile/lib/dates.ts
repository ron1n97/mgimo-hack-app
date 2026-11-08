/** YYYY-MM-DD in local calendar. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday–Sunday week containing `anchor` (local). */
export function weekRange(anchor: Date = new Date()): { from: string; to: string } {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: toIsoDate(mon), to: toIsoDate(sun) };
}

export function formatRuDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatRuLong(iso?: string): string {
  const date = iso
    ? (() => {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, (m ?? 1) - 1, d ?? 1);
      })()
    : new Date();
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
