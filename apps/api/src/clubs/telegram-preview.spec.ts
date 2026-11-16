import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  decodeHtmlEntities,
  extractEventAt,
  extractImageUrl,
  mskDateTimeToUtc,
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

  it('builds short title/body without noise lines', () => {
    expect(
      titleAndBodyFromText(
        '🎾 Кубок по паделу\n\nВпервые в МГИМО турнир.\n\nНа связи Студенческий союз',
      ),
    ).toEqual({
      title: 'Кубок по паделу',
      body: 'Впервые в МГИМО турнир.',
    });
  });

  it('parses event datetime from Russian club copy', () => {
    const published = new Date('2026-11-11T08:00:00.000Z');
    expect(extractEventAt('Увидимся 23 ноября в 16:00 на Главной сцене', published)).toEqual(
      mskDateTimeToUtc(2026, 11, 23, 16, 0),
    );
    expect(extractEventAt('Друзья! Завтра в 18:00 встреча', published)).toEqual(
      mskDateTimeToUtc(2026, 11, 12, 18, 0),
    );
    expect(extractEventAt('Просто новость без даты', published)).toBeNull();
  });

  it('extracts photo url from widget wrap', () => {
    const chunk =
      `<a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn4.telesco.pe/file/x.jpg')"></a>`;
    expect(extractImageUrl(chunk)).toBe('https://cdn4.telesco.pe/file/x.jpg');
  });

  it('parses fixture preview html with time/image/short body', () => {
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
    expect(posts[0].body.length).toBeLessThanOrEqual(280);
    expect(posts[0].imageUrl).toContain('telesco.pe');
    expect(posts[0].eventAt).toEqual(mskDateTimeToUtc(2026, 11, 20, 18, 0));
    expect(posts[2].title).toContain('Друзья!');
    expect(posts[2].eventAt).toEqual(mskDateTimeToUtc(2026, 11, 11, 18, 0));
  });
});
