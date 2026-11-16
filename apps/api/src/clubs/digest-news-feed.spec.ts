import {
  buildDigestNewsFeedPlan,
  isDigestNewsTitle,
  materializeDigestNewsFeed,
  moscowWeekInstant,
  pickClubSource,
  resolveDayOffsetFromMonday,
} from './digest-news-feed';
import { moscowDateString, moscowWeekBounds } from '../today/today-digest';

describe('digest-news-feed', () => {
  const clubs = [
    {
      id: 'c-ssk',
      name: 'Студенческий спортивный клуб (ССК)',
      sources: [
        {
          id: 's-tg',
          kind: 'TELEGRAM',
          url: 'https://t.me/sskmgimo',
          enabled: true,
        },
      ],
    },
    {
      id: 'c-nso',
      name: 'Научное студенческое общество (НСО)',
      sources: [
        {
          id: 's-vk',
          kind: 'VK',
          url: 'https://vk.com/nso.mgimo',
          enabled: true,
        },
        {
          id: 's-tg2',
          kind: 'TELEGRAM',
          url: 'https://t.me/nsomgimo',
          enabled: true,
        },
      ],
    },
    {
      id: 'c-culture',
      name: 'Культурный центр МГИМО',
      sources: [
        {
          id: 's-cult',
          kind: 'TELEGRAM',
          url: 'https://t.me/mgimoculturecentre',
          enabled: true,
        },
      ],
    },
    {
      id: 'c-souz',
      name: 'Студенческий союз МГИМО',
      sources: [
        {
          id: 's-souz-vk',
          kind: 'VK',
          url: 'https://vk.com/studsouz_mgimo',
          enabled: true,
        },
        {
          id: 's-souz-tg',
          kind: 'TELEGRAM',
          url: 'https://t.me/studsouzmgimo',
          enabled: true,
        },
      ],
    },
  ];

  it('builds a non-empty plan with Дайджест: titles', () => {
    const plan = buildDigestNewsFeedPlan();
    expect(plan.length).toBeGreaterThanOrEqual(4);
    for (const item of plan) {
      expect(isDigestNewsTitle(item.title)).toBe(true);
    }
  });

  it('resolves −1 day offset to today within MSK week', () => {
    // Wednesday 2026-11-18 MSK ≈ 2026-11-18T09:00Z
    const wed = new Date('2026-11-18T09:00:00.000Z');
    expect(resolveDayOffsetFromMonday(-1, wed)).toBe(2);
    expect(resolveDayOffsetFromMonday(5, wed)).toBe(5);
  });

  it('places startsAt inside the current Moscow week with club VK/TG urls', () => {
    const now = new Date('2026-11-18T09:00:00.000Z');
    const { from, to } = moscowWeekBounds(moscowDateString(now));
    const rows = materializeDigestNewsFeed(clubs, now);
    expect(rows.length).toBeGreaterThanOrEqual(4);

    const todayRow = rows.find((r) => r.seedKey === 'today-open');
    expect(todayRow).toBeDefined();
    expect(moscowDateString(todayRow!.startsAt)).toBe(moscowDateString(now));
    expect(todayRow!.url).toMatch(/t\.me\/sskmgimo#seed\/today-open/);

    const nso = rows.find((r) => r.seedKey === 'week-nso');
    expect(nso?.url).toMatch(/vk\.com\/nso.*#seed\/week-nso/);
    expect(nso?.sourceId).toBe('s-vk');

    for (const row of rows) {
      const day = moscowDateString(row.startsAt);
      expect(day >= from && day <= to).toBe(true);
      expect(row.url).toBeTruthy();
      expect(row.url).toMatch(/#seed\//);
      expect(row.url).toMatch(/vk\.com\/|t\.me\//);
    }
  });

  it('pickClubSource prefers VK then Telegram', () => {
    const nso = clubs[1];
    expect(pickClubSource(nso, 'VK')?.kind).toBe('VK');
    expect(pickClubSource(nso, 'TELEGRAM')?.kind).toBe('TELEGRAM');
    expect(pickClubSource(nso, 'ANY')?.kind).toBe('VK');
  });

  it('moscowWeekInstant uses UTC+3 for MSK hour', () => {
    const now = new Date('2026-11-16T12:00:00.000Z'); // Mon
    const instant = moscowWeekInstant({
      dayOffsetFromMonday: 0,
      hourMsk: 12,
      now,
    });
    // 12:00 MSK = 09:00 UTC
    expect(instant.toISOString()).toBe('2026-11-16T09:00:00.000Z');
  });
});
