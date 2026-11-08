import {
  buildScheduleDateFilter,
  isDateInRange,
  parseDateOnly,
} from './schedule-date-filter';

describe('schedule date filter', () => {
  it('parses YYYY-MM-DD and RUZ YYYY.MM.DD', () => {
    expect(parseDateOnly('2026-11-08')?.toISOString()).toBe(
      '2026-11-08T00:00:00.000Z',
    );
    expect(parseDateOnly('2026.11.08')?.toISOString()).toBe(
      '2026-11-08T00:00:00.000Z',
    );
    expect(parseDateOnly('not-a-date')).toBeNull();
  });

  it('builds inclusive from/to filter', () => {
    const filter = buildScheduleDateFilter('2026-11-01', '2026-11-08');
    expect(filter?.gte?.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(filter?.lte?.toISOString()).toBe('2026-11-08T00:00:00.000Z');
  });

  it('rejects inverted range', () => {
    expect(() => buildScheduleDateFilter('2026-11-10', '2026-11-01')).toThrow(
      /from must be <= to/,
    );
  });

  it('isDateInRange includes boundaries', () => {
    const from = parseDateOnly('2026-11-01')!;
    const to = parseDateOnly('2026-11-08')!;
    expect(isDateInRange(parseDateOnly('2026-11-01')!, from, to)).toBe(true);
    expect(isDateInRange(parseDateOnly('2026-11-08')!, from, to)).toBe(true);
    expect(isDateInRange(parseDateOnly('2026-11-09')!, from, to)).toBe(false);
    expect(isDateInRange(parseDateOnly('2026-10-31')!, from, to)).toBe(false);
  });
});
