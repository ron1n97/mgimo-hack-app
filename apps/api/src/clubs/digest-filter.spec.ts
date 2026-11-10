import {
  canModerateClubs,
  clubListVisibilityWhere,
  filterDigestByInterests,
} from './digest-filter';

describe('digest-filter', () => {
  const items = [
    {
      id: 'e1',
      clubId: 'c1',
      title: 'Match',
      tagIds: ['t-sport'],
      moderationStatus: 'APPROVED',
    },
    {
      id: 'e2',
      clubId: 'c2',
      title: 'Other club',
      tagIds: ['t-media'],
      moderationStatus: 'APPROVED',
    },
    {
      id: 'e3',
      clubId: 'c1',
      title: 'Pending',
      tagIds: ['t-sport'],
      moderationStatus: 'PENDING',
    },
  ];

  it('returns empty when student has no interests', () => {
    expect(
      filterDigestByInterests(items, { clubIds: [], tagIds: [] }),
    ).toEqual([]);
  });

  it('keeps approved items matching subscribed club or tag', () => {
    const byClub = filterDigestByInterests(items, {
      clubIds: ['c1'],
      tagIds: [],
    });
    expect(byClub.map((i) => i.id)).toEqual(['e1']);

    const byTag = filterDigestByInterests(items, {
      clubIds: [],
      tagIds: ['t-media'],
    });
    expect(byTag.map((i) => i.id)).toEqual(['e2']);
  });

  it('hides pending/rejected from personalized feed', () => {
    const result = filterDigestByInterests(items, {
      clubIds: ['c1'],
      tagIds: ['t-sport'],
    });
    expect(result.every((i) => i.moderationStatus === 'APPROVED')).toBe(true);
    expect(result.map((i) => i.id)).not.toContain('e3');
  });
});

describe('club catalog visibility (IDOR-safe)', () => {
  it('staff may see all clubs including drafts', () => {
    const where = clubListVisibilityWhere({
      actorRole: 'STAFF',
      actorUserId: 'staff-1',
    });
    expect(where.OR).toEqual([{}]);
  });

  it('student sees confirmed + own drafts only', () => {
    const where = clubListVisibilityWhere({
      actorRole: 'STUDENT',
      actorUserId: 'stu-1',
    });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { status: 'CONFIRMED' },
        { createdByUserId: 'stu-1' },
      ]),
    );
    expect(where.OR).not.toContainEqual({});
  });

  it('only staff/admin may moderate clubs', () => {
    expect(canModerateClubs('STUDENT')).toBe(false);
    expect(canModerateClubs('STAFF')).toBe(true);
    expect(canModerateClubs('ADMIN')).toBe(true);
  });
});
