import { isPostOrEventUrl, resolveDigestEventUrl } from './digest-event-url';

describe('digest event URL', () => {
  it('accepts telegram / vk post urls and seed fragments', () => {
    expect(isPostOrEventUrl('https://t.me/sskmgimo/9991')).toBe(true);
    expect(isPostOrEventUrl('https://t.me/c/123/456')).toBe(true);
    expect(isPostOrEventUrl('https://vk.com/wall-1_2')).toBe(true);
    expect(
      isPostOrEventUrl('https://t.me/nsomgimo#seed/digest-monday'),
    ).toBe(true);
  });

  it('rejects bare channel / club homepages', () => {
    expect(isPostOrEventUrl('https://t.me/sskmgimo')).toBe(false);
    expect(isPostOrEventUrl('https://vk.com/nso.mgimo')).toBe(false);
    expect(isPostOrEventUrl('https://example.com/club')).toBe(false);
    expect(isPostOrEventUrl(null)).toBe(false);
  });

  it('does not promote channel fallback when post url missing', () => {
    expect(
      resolveDigestEventUrl({
        url: null,
        sourceUrl: 'https://t.me/sskmgimo',
        clubSourceUrls: ['https://vk.com/club1'],
      }),
    ).toBeNull();
  });

  it('keeps post url over channel', () => {
    expect(
      resolveDigestEventUrl({
        url: 'https://t.me/sskmgimo/42',
        sourceUrl: 'https://t.me/sskmgimo',
      }),
    ).toBe('https://t.me/sskmgimo/42');
  });
});
