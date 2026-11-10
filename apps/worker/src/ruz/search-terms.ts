/**
 * Search terms for MGIMO RUZ /api/search?type=group.
 *
 * RUZ rejects too-short strings («Слишком короткая строка») and caps each
 * search at ~15 hits — bare «МЭО» often returns only 1–2 course. Course-
 * prefixed terms (`1МЭО`…`4МЭО`, `1МО-`…`4МО-`) recover 4th year.
 */

/** Faculty/program stems long enough for a bare search (≥3 chars). */
export const LONG_PREFIXES = [
  'МЭО',
  'МБДА',
  'МИЭП',
  'МГБ',
  'ФПЭК',
  'ТЭО',
  'МГИМО',
] as const;

/**
 * Stems that need a course year (and often a trailing dash) because the
 * bare 2-letter form is rejected by RUZ.
 */
export const COURSE_STEMS = [
  'МЭО',
  'МО',
  'МП',
  'МЖ',
  'МЮ',
  'ТЭО',
  'МБДА',
  'МИЭП',
  'МГБ',
  'ФПЭК',
  'ФП',
  'ФЭ',
  'ФМ',
  'ФУ',
  'БА',
  'МА',
] as const;

export const COURSE_YEARS = [1, 2, 3, 4] as const;

export function buildCoursePrefixedTerms(
  stems: readonly string[] = COURSE_STEMS,
  years: readonly number[] = COURSE_YEARS,
): string[] {
  const out: string[] = [];
  for (const stem of stems) {
    for (const year of years) {
      out.push(`${year}${stem}`);
      out.push(`${year}${stem}-`);
    }
  }
  return out;
}

export function buildSearchTerms(extra: string[] = []): string[] {
  const set = new Set<string>([
    ...LONG_PREFIXES,
    ...buildCoursePrefixedTerms(),
    ...extra,
  ]);
  return [...set];
}
