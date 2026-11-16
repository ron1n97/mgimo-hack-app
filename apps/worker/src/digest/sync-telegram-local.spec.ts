import { syncTelegramDigestLocal } from './sync-telegram-local';

jest.mock('../db', () => ({
  getPrisma: jest.fn(),
}));

jest.mock('./telegram-ingest', () => ({
  syncTelegramDigest: jest.fn(async () => ({
    sourcesTried: 1,
    sourcesOk: 1,
    postsUpserted: 2,
    postsSkippedRejected: 0,
    stubsRetired: 0,
    errors: [],
  })),
}));

describe('syncTelegramDigestLocal', () => {
  const prev = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = prev;
    jest.resetModules();
  });

  it('skips without DATABASE_URL', async () => {
    delete process.env.DATABASE_URL;
    await expect(syncTelegramDigestLocal()).resolves.toMatchObject({
      skipped: true,
      reason: 'DATABASE_URL missing',
    });
  });

  it('runs prisma ingest when DATABASE_URL is set', async () => {
    process.env.DATABASE_URL = 'postgresql://example';
    const { getPrisma } = await import('../db');
    (getPrisma as jest.Mock).mockReturnValue({ fake: true });
    await expect(syncTelegramDigestLocal()).resolves.toMatchObject({
      skipped: false,
      body: expect.objectContaining({ postsUpserted: 2 }),
    });
  });
});
