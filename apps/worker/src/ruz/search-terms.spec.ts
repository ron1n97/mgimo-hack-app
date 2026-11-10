import { buildSearchTerms } from './search-terms';

describe('RUZ group discovery search terms', () => {
  it('includes course-prefixed terms for 1–4 year МЭО / МО', () => {
    const terms = buildSearchTerms();
    for (const year of [1, 2, 3, 4]) {
      expect(terms).toContain(`${year}МЭО`);
      expect(terms).toContain(`${year}МО-`);
    }
  });

  it('does not rely on too-short two-letter stems alone', () => {
    const terms = buildSearchTerms();
    // bare «МО» is rejected by RUZ («Слишком короткая строка»)
    expect(terms).not.toContain('МО');
    // single Cyrillic letters are also too short
    expect(terms).not.toContain('А');
  });

  it('keeps longer faculty stems that return hits', () => {
    const terms = buildSearchTerms();
    expect(terms).toContain('МЭО');
    expect(terms).toContain('МИЭП');
  });
});
