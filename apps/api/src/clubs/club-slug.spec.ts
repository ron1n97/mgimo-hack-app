import { detectSourceKind, slugifyTag } from './club-slug';

describe('club-slug', () => {
  it('slugifies Russian category names', () => {
    expect(slugifyTag('Спорт')).toBe('sport');
    expect(slugifyTag('Землячества и нац. клубы')).toContain('zemlyachestva');
  });

  it('detects telegram and vk urls', () => {
    expect(detectSourceKind('https://t.me/sskmgimo')).toBe('TELEGRAM');
    expect(detectSourceKind('https://vk.com/nso.mgimo')).toBe('VK');
    expect(detectSourceKind('https://sportclub.mgimo.ru')).toBe('WEBSITE');
  });
});
