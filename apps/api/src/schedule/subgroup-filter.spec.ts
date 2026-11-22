import {
  buildSubGroupFilter,
  isCatalogLanguageSubGroup,
  matchesPreferredSubGroups,
  normalizePreferredSubGroupOids,
} from './subgroup-filter';

describe('subgroup preference filter', () => {
  const wholeGroup = { subGroupOid: null as string | null };
  const wholeGroupZero = { subGroupOid: '0' };
  const langA = { subGroupOid: '501' };
  const langB = { subGroupOid: '504' };

  it('without preference hides other subgroup parallels (only whole-group)', () => {
    expect(matchesPreferredSubGroups(wholeGroup, [])).toBe(true);
    expect(matchesPreferredSubGroups(wholeGroupZero, [])).toBe(true);
    expect(matchesPreferredSubGroups(langA, [])).toBe(false);
    expect(matchesPreferredSubGroups(langB, null)).toBe(false);
  });

  it('showAll (staff) reveals every parallel', () => {
    expect(matchesPreferredSubGroups(langB, ['501'], true)).toBe(true);
  });

  it('keeps whole-group lessons and preferred subgroup parallels', () => {
    const preferred = ['501'];
    expect(matchesPreferredSubGroups(wholeGroup, preferred)).toBe(true);
    expect(matchesPreferredSubGroups(wholeGroupZero, preferred)).toBe(true);
    expect(matchesPreferredSubGroups(langA, preferred)).toBe(true);
    expect(matchesPreferredSubGroups(langB, preferred)).toBe(false);
  });

  it('builds Prisma filter: empty pref → whole-group only (incl. RUZ "0"); never undefined for students', () => {
    expect(buildSubGroupFilter([], false)).toEqual({
      OR: [{ subGroupOid: null }, { subGroupOid: '' }, { subGroupOid: '0' }],
    });
    expect(buildSubGroupFilter(['501'], true)).toBeUndefined();
    expect(buildSubGroupFilter(['501', '504'], false)).toEqual({
      OR: [
        { subGroupOid: null },
        { subGroupOid: '' },
        { subGroupOid: '0' },
        { subGroupOid: { in: ['501', '504'] } },
      ],
    });
  });

  it('normalizes enrollment to at most one language subgroup (A2)', () => {
    expect(normalizePreferredSubGroupOids(null)).toEqual([]);
    expect(normalizePreferredSubGroupOids([])).toEqual([]);
    expect(normalizePreferredSubGroupOids(['0', '', '501', '504'])).toEqual([
      '501',
    ]);
    expect(normalizePreferredSubGroupOids(['10169', '10171'])).toEqual([
      '10169',
    ]);
  });

  it('hides whole-group marker "0" from language subgroup catalog', () => {
    expect(isCatalogLanguageSubGroup({ subGroupOid: '10169' })).toBe(true);
    expect(isCatalogLanguageSubGroup({ subGroupOid: '0' })).toBe(false);
    expect(isCatalogLanguageSubGroup({ subGroupOid: null })).toBe(false);
  });
});
