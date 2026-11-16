import { ingestDigest } from './ingest-digest';

function mockPrisma(sources: Array<Record<string, unknown>>) {
  const created: unknown[] = [];
  return {
    prisma: {
      clubSource: {
        findMany: jest.fn().mockResolvedValue(sources),
      },
      eventCandidate: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (args: unknown) => {
          created.push(args);
          return { id: `e-${created.length}` };
        }),
      },
    },
    created,
  };
}

describe('ingestDigest', () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops when VK_SERVICE_TOKEN is absent and skips TG scrape', async () => {
    const { prisma } = mockPrisma([
      {
        id: 's1',
        clubId: 'c1',
        kind: 'VK',
        url: 'https://vk.com/nso.mgimo',
        enabled: true,
      },
      {
        id: 's2',
        clubId: 'c2',
        kind: 'TELEGRAM',
        url: 'https://t.me/sskmgimo',
        enabled: true,
      },
    ]);

    const result = await ingestDigest({
      vkServiceToken: '',
      prisma: prisma as never,
      logger,
    });

    expect(result.skipped).toBe(true);
    expect(result.skipReason).toMatch(/VK_SERVICE_TOKEN/);
    expect(result.telegramSkipped).toBe(1);
    expect(result.created).toBe(0);
    expect(prisma.eventCandidate.create).not.toHaveBeenCalled();
  });

  it('fetches VK walls and creates PENDING candidates; never scrapes TG', async () => {
    const { prisma, created } = mockPrisma([
      {
        id: 's-vk',
        clubId: 'c-nso',
        kind: 'VK',
        url: 'https://vk.com/nso.mgimo',
        enabled: true,
      },
      {
        id: 's-tg',
        clubId: 'c-ssk',
        kind: 'TELEGRAM',
        url: 'https://t.me/sskmgimo',
        enabled: true,
      },
    ]);

    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: {
          count: 1,
          items: [
            {
              id: 77,
              owner_id: -42,
              date: 1_700_000_000,
              text: 'Лекция НСО\nЗал 1',
            },
          ],
        },
      }),
    });

    const result = await ingestDigest({
      vkServiceToken: 'service-token',
      prisma: prisma as never,
      fetchImpl: fetchImpl as never,
      logger,
    });

    expect(result.skipped).toBe(false);
    expect(result.vkSources).toBe(1);
    expect(result.telegramSkipped).toBe(1);
    expect(result.created).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchImpl.mock.calls[0][0]);
    expect(calledUrl).toContain('api.vk.com/method/wall.get');
    expect(calledUrl).toContain('domain=nso.mgimo');
    expect(calledUrl).not.toContain('t.me');

    const createArg = created[0] as { data: { moderationStatus: string; url: string } };
    expect(createArg.data.moderationStatus).toBe('PENDING');
    expect(createArg.data.url).toBe('https://vk.com/wall-42_77');
  });
});
