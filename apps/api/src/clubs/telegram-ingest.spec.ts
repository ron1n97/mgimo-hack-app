import { EventModerationStatus } from '@prisma/client';
import { sourceOwnsEvent, syncTelegramDigest } from './telegram-ingest';

describe('syncTelegramDigest', () => {
  it('upserts posts from enabled telegram sources and retires demo stubs only after success', async () => {
    const html = `
      <div class="tgme_widget_message js-widget_message" data-post="sskmgimo/10">
        <time datetime="2026-11-16T10:00:00+00:00"></time>
        <a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn4.telesco.pe/file/train.jpg')"></a>
        <div class="tgme_widget_message_text js-message_text">Реальная тренировка<br/>Зал 3. Сбор 18 ноября в 19:30</div>
      </div>`;

    const created: unknown[] = [];
    const prisma = {
      clubSource: {
        findMany: jest.fn(async () => [
          {
            id: 'src1',
            url: 'https://t.me/sskmgimo',
            clubId: 'club1',
            club: { id: 'club1', digestEnabled: true },
          },
        ]),
      },
      eventCandidate: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: { data: unknown }) => {
          created.push(data);
          return data;
        }),
        update: jest.fn(),
        updateMany: jest.fn(async () => ({ count: 2 })),
      },
    };

    const result = await syncTelegramDigest(prisma as never, {
      fetchHtml: async () => html,
      now: new Date('2026-11-16T12:00:00Z'),
      retireDemoStubs: true,
    });

    expect(result.sourcesOk).toBe(1);
    expect(result.postsUpserted).toBe(1);
    expect(result.stubsRetired).toBe(2);
    expect(created[0]).toMatchObject({
      url: 'https://t.me/sskmgimo/10',
      title: 'Реальная тренировка',
      body: 'Зал 3. Сбор 18 ноября в 19:30',
      imageUrl: 'https://cdn4.telesco.pe/file/train.jpg',
      moderationStatus: EventModerationStatus.APPROVED,
    });
    expect((created[0] as { startsAt: Date }).startsAt.toISOString()).toBe(
      '2026-11-18T16:30:00.000Z', // 19:30 MSK
    );
    expect(prisma.eventCandidate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { title: { startsWith: 'Демо:' } },
            { title: { startsWith: 'Новость:' } },
            { title: { startsWith: 'Дайджест:' } },
          ]),
        }),
      }),
    );
  });

  it('does not retire stubs when ingest yields zero posts', async () => {
    const prisma = {
      clubSource: {
        findMany: jest.fn(async () => [
          {
            id: 'src1',
            url: 'https://t.me/sskmgimo',
            clubId: 'club1',
            club: { id: 'club1', digestEnabled: true },
          },
        ]),
      },
      eventCandidate: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(async () => ({ count: 9 })),
      },
    };

    const result = await syncTelegramDigest(prisma as never, {
      fetchHtml: async () => {
        throw new Error('blocked');
      },
      now: new Date('2026-11-16T12:00:00Z'),
      retireDemoStubs: true,
    });

    expect(result.postsUpserted).toBe(0);
    expect(result.stubsRetired).toBe(0);
    expect(prisma.eventCandidate.updateMany).not.toHaveBeenCalled();
  });

  it('does not reassign a post URL owned by another club', async () => {
    const html = `
      <div class="tgme_widget_message js-widget_message" data-post="sskmgimo/10">
        <time datetime="2026-11-16T10:00:00+00:00"></time>
        <div class="tgme_widget_message_text js-message_text">Тренировка</div>
      </div>`;
    const prisma = {
      clubSource: {
        findMany: jest.fn(async () => [
          {
            id: 'alias-src',
            url: 'https://t.me/s/sskmgimo',
            clubId: 'attacker-club',
            club: { id: 'attacker-club', digestEnabled: true },
          },
        ]),
      },
      eventCandidate: {
        findFirst: jest.fn(async () => ({
          id: 'ev-official',
          moderationStatus: EventModerationStatus.APPROVED,
          clubId: 'official-club',
          sourceId: 'official-src',
        })),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
    };

    const result = await syncTelegramDigest(prisma as never, {
      fetchHtml: async () => html,
      now: new Date('2026-11-16T12:00:00Z'),
      retireDemoStubs: false,
    });

    expect(result.postsSkippedForeign).toBe(1);
    expect(result.postsUpserted).toBe(0);
    expect(prisma.eventCandidate.update).not.toHaveBeenCalled();
    expect(
      sourceOwnsEvent(
        { id: 'alias-src', clubId: 'attacker-club' },
        { clubId: 'official-club', sourceId: 'official-src' },
      ),
    ).toBe(false);
  });

  it('skips staff-rejected posts on re-ingest', async () => {
    const html = `
      <div class="tgme_widget_message js-widget_message" data-post="sskmgimo/10">
        <time datetime="2026-11-16T10:00:00+00:00"></time>
        <div class="tgme_widget_message_text js-message_text">Спам</div>
      </div>`;
    const prisma = {
      clubSource: {
        findMany: jest.fn(async () => [
          {
            id: 'src1',
            url: 'https://t.me/sskmgimo',
            clubId: 'club1',
            club: { id: 'club1', digestEnabled: true },
          },
        ]),
      },
      eventCandidate: {
        findFirst: jest.fn(async () => ({
          id: 'ev1',
          moderationStatus: EventModerationStatus.REJECTED,
        })),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
    };

    const result = await syncTelegramDigest(prisma as never, {
      fetchHtml: async () => html,
      now: new Date('2026-11-16T12:00:00Z'),
      retireDemoStubs: false,
    });

    expect(result.postsSkippedRejected).toBe(1);
    expect(result.postsUpserted).toBe(0);
    expect(prisma.eventCandidate.update).not.toHaveBeenCalled();
    expect(prisma.eventCandidate.create).not.toHaveBeenCalled();
  });

  it('skips stale posts', async () => {
    const html = `
      <div class="tgme_widget_message js-widget_message" data-post="sskmgimo/1">
        <time datetime="2026-01-01T10:00:00+00:00"></time>
        <div class="tgme_widget_message_text js-message_text">Старый пост</div>
      </div>`;
    const prisma = {
      clubSource: {
        findMany: jest.fn(async () => [
          {
            id: 'src1',
            url: 'https://t.me/sskmgimo',
            clubId: 'club1',
            club: { id: 'club1', digestEnabled: true },
          },
        ]),
      },
      eventCandidate: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
    };

    const result = await syncTelegramDigest(prisma as never, {
      fetchHtml: async () => html,
      now: new Date('2026-11-16T12:00:00Z'),
      maxAgeDays: 21,
      retireDemoStubs: false,
    });

    expect(result.postsUpserted).toBe(0);
    expect(prisma.eventCandidate.create).not.toHaveBeenCalled();
  });
});
