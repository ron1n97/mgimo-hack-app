import { disconnectPrisma, getPrisma } from '../db';
import { syncTelegramDigestLocal } from './sync-telegram-local';

jest.mock('../db', () => ({
  getPrisma: jest.fn(),
  disconnectPrisma: jest.fn(async () => undefined),
}));

jest.mock('./telegram-ingest', () => ({
  syncTelegramDigest: jest.fn(async () => ({
    sourcesTried: 1,
    sourcesOk: 1,
    postsUpserted: 2,
    postsSkippedRejected: 0,
    postsSkippedForeign: 0,
    stubsRetired: 0,
    errors: [],
  })),
}));

describe('syncTelegramDigestLocal', () => {
  const prev = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = prev;
    jest.clearAllMocks();
  });

  it('skips without DATABASE_URL', async () => {
    delete process.env.DATABASE_URL;
    await expect(syncTelegramDigestLocal()).resolves.toMatchObject({
      skipped: true,
      reason: 'DATABASE_URL missing',
    });
    expect(disconnectPrisma).not.toHaveBeenCalled();
  });

  it('runs prisma ingest when DATABASE_URL is set', async () => {
    process.env.DATABASE_URL = 'postgresql://example';
    (getPrisma as jest.Mock).mockReturnValue({ fake: true });
    await expect(
      syncTelegramDigestLocal({ disconnect: true }),
    ).resolves.toMatchObject({
      skipped: false,
      body: expect.objectContaining({ postsUpserted: 2 }),
    });
    expect(disconnectPrisma).toHaveBeenCalled();
  });
});
