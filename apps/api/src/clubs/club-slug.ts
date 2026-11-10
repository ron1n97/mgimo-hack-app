/**
 * Stable slug for club tags (RU categories → ascii-ish slug).
 */
const CYR_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function slugifyTag(name: string): string {
  const lower = name.trim().toLowerCase();
  let out = '';
  for (const ch of lower) {
    if (CYR_MAP[ch] !== undefined) {
      out += CYR_MAP[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else if (/\s|[./,&()+-]/.test(ch)) {
      out += '-';
    }
  }
  return out.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'tag';
}

export function detectSourceKind(
  url: string,
): 'TELEGRAM' | 'VK' | 'WEBSITE' {
  const u = url.toLowerCase();
  if (u.includes('t.me/') || u.includes('telegram.me/')) return 'TELEGRAM';
  if (u.includes('vk.com/') || u.includes('vkontakte.ru/')) return 'VK';
  return 'WEBSITE';
}
