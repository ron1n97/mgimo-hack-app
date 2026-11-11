import {
  shouldApplyRuzLessonUpsert,
  shouldSkipGroupRuzSync,
} from './schedule-sot';

describe('schedule source-of-truth policy', () => {
  it('pulls on miss (no local rows)', () => {
    expect(shouldSkipGroupRuzSync(0)).toBe(false);
  });

  it('allows enrichment when coverage exists but no subGroupOid yet', () => {
    expect(shouldSkipGroupRuzSync(12, 0)).toBe(false);
  });

  it('skips RUZ when coverage exists and discriminators already present', () => {
    expect(shouldSkipGroupRuzSync(12, 3)).toBe(true);
    expect(shouldSkipGroupRuzSync(1, 1)).toBe(true);
  });

  it('creates when no local row exists', () => {
    expect(shouldApplyRuzLessonUpsert(null)).toBe('create');
    expect(shouldApplyRuzLessonUpsert(undefined)).toBe('create');
  });

  it('never overwrites LOCAL / owned rows from RUZ', () => {
    expect(shouldApplyRuzLessonUpsert('LOCAL')).toBe('skip');
    expect(
      shouldApplyRuzLessonUpsert({ source: 'LOCAL', subGroupOid: null }),
    ).toBe('skip');
  });

  it('enriches legacy RUZ rows that still lack subGroupOid', () => {
    expect(
      shouldApplyRuzLessonUpsert({ source: 'RUZ', subGroupOid: null }),
    ).toBe('update');
  });

  it('does not casually overwrite complete RUZ rows', () => {
    expect(
      shouldApplyRuzLessonUpsert({ source: 'RUZ', subGroupOid: '501' }),
    ).toBe('skip');
    expect(shouldApplyRuzLessonUpsert('RUZ')).toBe('update'); // string form has no oid → enrich
  });
});
