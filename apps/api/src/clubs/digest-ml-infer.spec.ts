import {
  predictFromFeatures,
  predictTfidf,
  charWbNgrams,
  type DigestMlModel,
} from './digest-ml-infer';

describe('digest-ml-infer', () => {
  it('char_wb emits padded n-grams', () => {
    const g = charWbNgrams('ab', 2, 2);
    expect(g).toContain(' a');
    expect(g).toContain('ab');
    expect(g).toContain('b ');
  });

  it('LogReg head maps features to pEvent and uncertainty band', () => {
    const model: DigestMlModel = {
      type: 'logreg_embedding',
      version: 1,
      classes: ['junk', 'event'],
      coef: [[2, 0]],
      intercept: [0],
      thresholds: { low: 0.35, high: 0.65 },
      embed: { model: 'x', dimensions: 2, normalize: false },
    };
    const hi = predictFromFeatures([2, 0], model);
    expect(hi.pEvent).toBeGreaterThan(0.9);
    expect(hi.uncertain).toBe(false);
    expect(hi.label).toBe('event');

    const mid = predictFromFeatures([0.1, 0], model);
    expect(mid.uncertain).toBe(true);
  });

  it('tfidf path classifies with vocabulary', () => {
    // Minimal vocab: boost "сбор" ngrams toward event
    const vocabulary: Record<string, number> = {};
    const idf: number[] = [];
    const grams = charWbNgrams(' сбор ', 3, 3);
    for (const g of grams) {
      if (vocabulary[g] === undefined) {
        vocabulary[g] = idf.length;
        idf.push(1.5);
      }
    }
    const dim = idf.length;
    const coef = new Array(dim).fill(0);
    for (let i = 0; i < dim; i += 1) coef[i] = 3;
    const model: DigestMlModel = {
      type: 'logreg_tfidf',
      version: 1,
      classes: ['junk', 'event'],
      coef: [coef],
      intercept: [0],
      thresholds: { low: 0.35, high: 0.65 },
      tfidf: {
        analyzer: 'char_wb',
        ngram_range: [3, 3],
        vocabulary,
        idf,
      },
    };
    const pred = predictTfidf('Сбор в 19:30', model);
    expect(pred.label).toBe('event');
    expect(pred.pEvent).toBeGreaterThan(0.5);
  });
});
