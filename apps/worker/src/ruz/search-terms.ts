/**
 * Short search terms for MGIMO RUZ /api/search?type=group.
 * Faculty/program prefixes + Cyrillic letters catch most groups.
 */
export const GROUP_PREFIXES = [
  'МО',
  'МЭО',
  'МП',
  'ТЭО',
  'МЖ',
  'МБДА',
  'МИЭП',
  'МЮ',
  'МГБ',
  'ФПЭК',
  'ФП',
  'ФЭ',
  'ФМ',
  'ФУ',
  'МГИМО',
  'БА',
  'МА',
] as const;

/** Single Cyrillic letters — RUZ search returns groups matching the term */
export const CYRILLIC_LETTERS = [
  'А',
  'Б',
  'В',
  'Г',
  'Д',
  'Е',
  'Ж',
  'З',
  'И',
  'К',
  'Л',
  'М',
  'Н',
  'О',
  'П',
  'Р',
  'С',
  'Т',
  'У',
  'Ф',
  'Х',
  'Ц',
  'Ч',
  'Ш',
  'Э',
  'Ю',
  'Я',
] as const;

export function buildSearchTerms(extra: string[] = []): string[] {
  const set = new Set<string>([...GROUP_PREFIXES, ...CYRILLIC_LETTERS, ...extra]);
  return [...set];
}
