import {
  fetchVkWall,
  mapVkPostToCandidate,
  parseVkDomain,
  vkPostUrl,
} from './vk';

describe('vk digest helpers', () => {
  it('parses screen name from vk.com URLs', () => {
    expect(parseVkDomain('https://vk.com/nso.mgimo')).toBe('nso.mgimo');
    expect(parseVkDomain('https://vk.com/studsouz_mgimo')).toBe(
      'studsouz_mgimo',
    );
    expect(parseVkDomain('https://t.me/sskmgimo')).toBeNull();
    expect(parseVkDomain('not-a-url')).toBeNull();
  });

  it('builds wall post URLs and candidate fields', () => {
    expect(vkPostUrl(-123, 45)).toBe('https://vk.com/wall-123_45');
    const mapped = mapVkPostToCandidate({
      id: 45,
      owner_id: -123,
      date: 1_700_000_000,
      text: 'Открытая лекция НСО\nПодробности в комментариях',
    });
    expect(mapped.title).toBe('Открытая лекция НСО');
    expect(mapped.url).toBe('https://vk.com/wall-123_45');
    expect(mapped.externalKey).toBe('vk:-123_45');
    expect(mapped.startsAt.toISOString()).toBe(
      new Date(1_700_000_000 * 1000).toISOString(),
    );
  });

  it('fetchVkWall maps API payload and surfaces errors', async () => {
    const ok = await fetchVkWall({
      domain: 'nso.mgimo',
      accessToken: 'tok',
      fetchImpl: (async () =>
        ({
          ok: true,
          json: async () => ({
            response: {
              count: 1,
              items: [
                {
                  id: 1,
                  owner_id: -9,
                  date: 1_700_000_100,
                  text: 'Новость',
                },
              ],
            },
          }),
        }) as Response),
    });
    expect(ok.posts).toHaveLength(1);
    expect(ok.error).toBeUndefined();

    const err = await fetchVkWall({
      domain: 'x',
      accessToken: 'tok',
      fetchImpl: (async () =>
        ({
          ok: true,
          json: async () => ({
            error: { error_code: 5, error_msg: 'User authorization failed' },
          }),
        }) as Response),
    });
    expect(err.posts).toHaveLength(0);
    expect(err.error).toMatch(/5:/);
  });
});
