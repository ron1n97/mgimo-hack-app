import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  decodeHtmlEntities,
  parseTelegramPreviewHtml,
  stripHtml,
  telegramPreviewUrl,
  telegramUsernameFromUrl,
  titleAndBodyFromText,
} from './telegram-preview';

describe('telegram-preview', () => {
  it('extracts username from t.me urls', () => {
    expect(telegramUsernameFromUrl('https://t.me/sskmgimo')).toBe('sskmgimo');
    expect(telegramUsernameFromUrl('https://t.me/s/sskmgimo')).toBe('sskmgimo');
    expect(telegramUsernameFromUrl('https://t.me/sskmgimo/123')).toBe('sskmgimo');
    expect(telegramUsernameFromUrl('https://vk.com/x')).toBeNull();
  });

  it('builds public preview urls', () => {
    expect(telegramPreviewUrl('https://t.me/StudSouzMgimo')).toBe(
      'https://t.me/s/StudSouzMgimo',
    );
    expect(telegramPreviewUrl('@nsomgimo')).toBe('https://t.me/s/nsomgimo');
    expect(telegramPreviewUrl('https://t.me/joinchat/xxx')).toBeNull();
  });

  it('decodes entities and strips html', () => {
    expect(decodeHtmlEntities('Друзья&#33;')).toBe('Друзья!');
    expect(stripHtml('А<br/>Б &quot;в&quot;')).toBe('А\nБ "в"');
  });

  it('splits title/body from first line', () => {
    expect(titleAndBodyFromText('Заголовок\nВторая\nТретья')).toEqual({
      title: 'Заголовок',
      body: 'Вторая\nТретья',
    });
  });

  it('parses fixture preview html', () => {
    const html = readFileSync(
      join(__dirname, 'fixtures', 'preview-sample.html'),
      'utf8',
    );
    const posts = parseTelegramPreviewHtml(html);
    expect(posts.length).toBe(3);
    expect(posts[0].postId).toBe('studsouzmgimo/9991');
    expect(posts[0].url).toBe('https://t.me/studsouzmgimo/9991');
    expect(posts[0].title).toContain('Сбор заявок');
    expect(posts[0].body).toContain('Успей до пятницы');
    expect(posts[2].title).toContain('Друзья!');
  });
});
