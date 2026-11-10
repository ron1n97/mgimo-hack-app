import { parseRuzArrayResponse } from './parse-response';

describe('parseRuzArrayResponse', () => {
  it('returns arrays as-is', () => {
    expect(parseRuzArrayResponse([{ id: 1 }], 'search', 'МЭО')).toEqual([
      { id: 1 },
    ]);
  });

  it('throws when RUZ returns an error object instead of silently yielding []', () => {
    expect(() =>
      parseRuzArrayResponse(
        { error: true, message: 'Слишком короткая строка' },
        'search',
        'МО',
      ),
    ).toThrow(/Слишком короткая строка|RUZ search/);
  });
});
