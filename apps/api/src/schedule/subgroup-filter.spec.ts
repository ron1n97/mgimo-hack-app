import {
  buildSubGroupFilter,
  matchesPreferredSubGroups,
} from './subgroup-filter';

describe('subgroup preference filter', () => {
  const wholeGroup = { subGroupOid: null as string | null };
  const langA = { subGroupOid: '501' };
  const langB = { subGroupOid: '504' };

  it('without preference hides other subgroup parallels (only whole-group)', () => {
    expect(matchesPreferredSubGroups(wholeGroup, [])).toBe(true);
    expect(matchesPreferredSubGroups(langA, [])).toBe(false);
    expect(matchesPreferredSubGroups(langB, null)).toBe(false);
  });

  it('showAll (staff) reveals every parallel', () => {
    expect(matchesPreferredSubGroups(langB, ['501'], true)).toBe(true);
  });

  it('keeps whole-group lessons and preferred subgroup parallels', () => {
    const preferred = ['501'];
    expect(matchesPreferredSubGroups(wholeGroup, preferred)).toBe(true);
    expect(matchesPreferredSubGroups(langA, preferred)).toBe(true);
    expect(matchesPreferredSubGroups(langB, preferred)).toBe(false);
  });

  it('builds Prisma filter: empty pref → whole-group only; never undefined for students', () => {
    expect(buildSubGroupFilter([], false)).toEqual({
      OR: [{ subGroupOid: null }, { subGroupOid: '' }],
    });
    expect(buildSubGroupFilter(['501'], true)).toBeUndefined();
    expect(buildSubGroupFilter(['501', '504'], false)).toEqual({
      OR: [
        { subGroupOid: null },
        { subGroupOid: '' },
        { subGroupOid: { in: ['501', '504'] } },
      ],
    });
  });
});
