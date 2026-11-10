import { shouldSkipGroupRuzSync } from './schedule-sot';
import {
  buildRuzExternalId,
  defaultSyncRange,
  ensureGroupScheduleFromRuz,
} from './ruz-lazy-pull';

describe('ruz lazy pull helpers', () => {
  it('builds a two-week default sync range', () => {
    const range = defaultSyncRange(new Date(Date.UTC(2026, 10, 11)));
    expect(range.startStr).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    expect(range.finishStr).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    const days =
      (range.to.getTime() - range.from.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(13);
  });

  it('prefers lessonOid for external id', () => {
    expect(
      buildRuzExternalId({ lessonOid: 42, date: '2026.11.10' }, '8033'),
    ).toBe('42');
  });
});

describe('ensureGroupScheduleFromRuz', () => {
  it('skips RUZ fetch when coverage exists with subgroup discriminators', async () => {
    const fetchImpl = jest.fn();
    const prisma = {
      scheduleLesson: {
        count: jest
          .fn()
          .mockResolvedValueOnce(3) // total
          .mockResolvedValueOnce(2), // withSubGroupOid
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    expect(shouldSkipGroupRuzSync(3, 2)).toBe(true);
    const result = await ensureGroupScheduleFromRuz(prisma as never, {
      groupRuzId: '8033',
      groupLabel: '2МЭО-01',
      fetchImpl: fetchImpl as never,
    });
    expect(result).toEqual({ pulled: false, created: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('pulls and creates on miss without overwriting LOCAL keys', async () => {
    const payload = [
      {
        lessonOid: 10001,
        date: '2026.11.10',
        beginLesson: '14:30',
        endLesson: '16:00',
        discipline: 'Английский',
        subGroup: '01-нем',
        subGroupOid: 501,
      },
      {
        lessonOid: 10002,
        date: '2026.11.10',
        beginLesson: '14:30',
        endLesson: '16:00',
        discipline: 'Английский',
        subGroup: '04-хинди',
        subGroupOid: 504,
      },
    ];
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      scheduleLesson: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ source: 'LOCAL', subGroupOid: null }),
        create,
        update: jest.fn(),
      },
    };

    const result = await ensureGroupScheduleFromRuz(prisma as never, {
      groupRuzId: '8033',
      groupLabel: '2МЭО-01',
      from: new Date(Date.UTC(2026, 10, 9)),
      to: new Date(Date.UTC(2026, 10, 22)),
      fetchImpl: fetchImpl as never,
    });

    expect(result.pulled).toBe(true);
    expect(result.created).toBe(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.source).toBe('RUZ');
    expect(create.mock.calls[0][0].data.subGroupOid).toBe('501');
  });
});
