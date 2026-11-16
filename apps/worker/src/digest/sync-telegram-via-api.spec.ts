import { syncTelegramDigestViaApi } from './sync-telegram-via-api';

describe('syncTelegramDigestViaApi', () => {
  it('skips when key or api url missing', async () => {
    await expect(
      syncTelegramDigestViaApi({ apiUrl: '', ingestKey: 'x' }),
    ).resolves.toMatchObject({ skipped: true });
    await expect(
      syncTelegramDigestViaApi({
        apiUrl: 'http://api:3001',
        ingestKey: '',
      }),
    ).resolves.toMatchObject({ skipped: true });
  });

  it('posts x-digest-key to internal endpoint', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ postsUpserted: 3 }),
    }));
    const result = await syncTelegramDigestViaApi({
      apiUrl: 'http://api:3001/',
      ingestKey: 'secret',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api:3001/internal/digest/telegram',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-digest-key': 'secret' }),
      }),
    );
    expect(result).toMatchObject({
      skipped: false,
      body: { postsUpserted: 3 },
    });
  });
});
