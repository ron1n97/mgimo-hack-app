import { EventModerationStatus } from '@prisma/client';
import {
  classifyDigestHeuristic,
  classifyDigestPost,
  improveDigestTitle,
} from './digest-event-classify';

describe('classifyDigestHeuristic (fallback only)', () => {
  it('approves clear campus events', () => {
    expect(
      classifyDigestHeuristic({
        title: 'Битва факультетов 2026',
        body: 'Сбор 22 ноября в 19:30, зал 3. Регистрация открыта.',
      }).status,
    ).toBe(EventModerationStatus.APPROVED);
  });

  it('rejects birthdays', () => {
    expect(
      classifyDigestHeuristic({
        title: 'Сегодня поздравляем с днем рождения Марину',
        body: 'Глава отдела!',
      }).status,
    ).toBe(EventModerationStatus.REJECTED);
  });
});

describe('improveDigestTitle', () => {
  it('lifts event name from greeting posts', () => {
    const t = improveDigestTitle(
      'Дорогие друзья!',
      '19 ноября (чт) состоится открытый семинар с молодым дипломатом «Будущее отношений России со странами Евросоюза». Формат — дискуссия.',
    );
    expect(t.toLowerCase()).toMatch(/евросоюз|будущее отношений|19 ноября/);
  });
});

describe('classifyDigestPost', () => {
  it('uses injected classifyImpl', async () => {
    const r = await classifyDigestPost(
      { title: 'x', body: 'y' },
      {
        classifyImpl: async () => ({
          status: EventModerationStatus.APPROVED,
          source: 'ml',
          reason: 'test',
        }),
      },
    );
    expect(r.source).toBe('ml');
    expect(r.status).toBe(EventModerationStatus.APPROVED);
  });

  it('LLM verifies when ML skipped / uncertain path', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"verdict":"event","reason":"есть дата сбора"}',
            },
          },
        ],
      }),
    })) as unknown as typeof fetch;

    const r = await classifyDigestPost(
      {
        title: 'Важное объявление клуба',
        body: 'Друзья, скоро расскажем подробности про большую встречу.',
      },
      { apiKey: 'test-key', fetchImpl, skipMl: true },
    );
    expect(r.status).toBe(EventModerationStatus.APPROVED);
    expect(r.source).toBe('zcode');
    expect(fetchImpl).toHaveBeenCalled();
  });
});
