import {
  buildSubGroupFilter,
  matchesPreferredSubGroups,
} from './subgroup-filter';

describe('subgroup preference filter', () => {
  const wholeGroup = { subGroupOid: null as string | null };
  const langA = { subGroupOid: '501' };
  const langB = { subGroupOid: '504' };

  it('shows all lessons when no preference set', () => {
    expect(matchesPreferredSubGroups(langA, [])).toBe(true);
    expect(matchesPreferredSubGroups(langB, null)).toBe(true);
    expect(matchesPreferredSubGroups(wholeGroup, undefined)).toBe(true);
  });

  it('shows all when showAll is true even with preference', () => {
    expect(matchesPreferredSubGroups(langB, ['501'], true)).toBe(true);
  });

  it('keeps whole-group lessons and preferred subgroup parallels', () => {
    const preferred = ['501'];
    expect(matchesPreferredSubGroups(wholeGroup, preferred)).toBe(true);
    expect(matchesPreferredSubGroups(langA, preferred)).toBe(true);
    expect(matchesPreferredSubGroups(langB, preferred)).toBe(false);
  });

  it('builds Prisma-compatible OR filter for preferred oids', () => {
    expect(buildSubGroupFilter([], false)).toBeUndefined();
    expect(buildSubGroupFilter(['501'], true)).toBeUndefined();
    expect(buildSubGroupFilter(['501', '504'], false)).toEqual({
      OR: [
        { subGroupOid: null },
        { subGroupOid: { in: ['501', '504'] } },
      ],
    });
  });
});
