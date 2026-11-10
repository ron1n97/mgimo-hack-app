import {
  shouldApplyRuzLessonUpsert,
  shouldSkipGroupRuzSync,
} from './schedule-sot';

describe('schedule source-of-truth policy', () => {
  it('skips RUZ group sync when local rows already cover the range', () => {
    expect(shouldSkipGroupRuzSync(0)).toBe(false);
    expect(shouldSkipGroupRuzSync(1)).toBe(true);
    expect(shouldSkipGroupRuzSync(12)).toBe(true);
  });

  it('creates when no local row exists', () => {
    expect(shouldApplyRuzLessonUpsert(null)).toBe(true);
    expect(shouldApplyRuzLessonUpsert(undefined)).toBe(true);
  });

  it('never overwrites LOCAL / owned rows from RUZ', () => {
    expect(shouldApplyRuzLessonUpsert('LOCAL')).toBe(false);
  });

  it('does not casually overwrite existing RUZ rows (DB is SoT once present)', () => {
    expect(shouldApplyRuzLessonUpsert('RUZ')).toBe(false);
  });
});
