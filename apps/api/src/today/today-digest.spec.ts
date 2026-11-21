import {
  moscowDateStringOf,
  moscowWeekBounds,
  splitClubDigestByDay,
} from './today-digest';

describe('today-digest', () => {
  it('maps ISO timestamps to Moscow calendar days', () => {
    // 2026-11-14 22:30 UTC → already 15th in Moscow (UTC+3)
    expect(moscowDateStringOf('2026-11-14T22:30:00.000Z')).toBe('2026-11-15');
    expect(moscowDateStringOf('2026-11-14T10:00:00.000Z')).toBe('2026-11-14');
  });

  it('computes Mon–Sun week bounds for a Saturday', () => {
    // 2026-11-14 is Saturday
    expect(moscowWeekBounds('2026-11-14')).toEqual({
      from: '2026-11-09',
      to: '2026-11-15',
    });
  });

  it('splits approved club events into today vs week buckets', () => {
    const events = [
      {
        id: '1',
        title: 'Сегодня',
        startsAt: '2026-11-14T12:00:00.000Z',
        club: { id: 'c1', name: 'Клуб' },
      },
      {
        id: '2',
        title: 'В среду',
        startsAt: '2026-11-11T12:00:00.000Z',
        club: { id: 'c1', name: 'Клуб' },
      },
      {
        id: '3',
        title: 'На прошлой неделе',
        startsAt: '2026-11-01T12:00:00.000Z',
        club: { id: 'c2', name: 'Другой' },
      },
      {
        id: '4',
        title: 'Без даты',
        startsAt: null,
      },
    ];
    const { today, week } = splitClubDigestByDay(events, '2026-11-14');
    expect(today.map((e) => e.id)).toEqual(['1']);
    // Undated posts stay in week so the feed is not silent.
    expect(week.map((e) => e.id).sort()).toEqual(['1', '2', '4']);
  });
});
