import {
  isBareSocialChannel,
  isPostOrEventUrl,
  resolveDigestEventUrl,
} from './digest-event-url';

describe('digest event URL', () => {
  it('accepts real telegram/vk posts and event sites', () => {
    expect(isPostOrEventUrl('https://t.me/sskmgimo/9991')).toBe(true);
    expect(isPostOrEventUrl('https://t.me/c/123/456')).toBe(true);
    expect(isPostOrEventUrl('https://vk.com/wall-1_2')).toBe(true);
    expect(isPostOrEventUrl('https://mgimobc.timepad.ru')).toBe(true);
    expect(isPostOrEventUrl('https://example.com/events/42')).toBe(true);
  });

  it('rejects synthetic seed/demo fragment URLs (broken fake posts)', () => {
    expect(
      isPostOrEventUrl('https://t.me/nsomgimo/1#seed/digest-monday'),
    ).toBe(false);
    expect(
      isPostOrEventUrl('https://vk.com/wall-1_2#seed/week-nso'),
    ).toBe(false);
    expect(isPostOrEventUrl('https://t.me/sskmgimo/9#demo/x')).toBe(false);
  });

  it('rejects bare channel / club homepages', () => {
    expect(isBareSocialChannel('https://t.me/sskmgimo')).toBe(true);
    expect(isPostOrEventUrl('https://t.me/sskmgimo')).toBe(false);
    expect(isPostOrEventUrl('https://vk.com/nso.mgimo')).toBe(false);
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

  it('keeps post/event url over channel', () => {
    expect(
      resolveDigestEventUrl({
        url: 'https://t.me/sskmgimo/42',
        sourceUrl: 'https://t.me/sskmgimo',
      }),
    ).toBe('https://t.me/sskmgimo/42');
  });
});
