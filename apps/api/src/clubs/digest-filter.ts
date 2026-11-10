export type DigestFeedItem = {
  id: string;
  clubId: string | null;
  title: string;
  tagIds: string[];
  moderationStatus: string;
};

export type DigestInterests = {
  clubIds: string[];
  tagIds: string[];
};

/**
 * Filter approved digest items by student club/tag subscriptions.
 * Empty interests → empty personalized feed (caller may fall back to unfiltered).
 */
export function filterDigestByInterests(
  items: DigestFeedItem[],
  interests: DigestInterests,
): DigestFeedItem[] {
  const clubSet = new Set(interests.clubIds);
  const tagSet = new Set(interests.tagIds);
  const hasAny = clubSet.size > 0 || tagSet.size > 0;
  if (!hasAny) return [];

  return items.filter((item) => {
    if (item.moderationStatus !== 'APPROVED') return false;
    if (item.clubId && clubSet.has(item.clubId)) return true;
    return item.tagIds.some((t) => tagSet.has(t));
  });
}

export type ClubListVisibility = {
  actorRole: string;
  actorUserId: string;
  /** When true, staff/admin see drafts; students see confirmed + own drafts */
  includeAllDrafts?: boolean;
};

/**
 * Prisma-ish where fragment for club catalog visibility (IDOR-safe listing).
 */
export function clubListVisibilityWhere(params: ClubListVisibility): {
  OR: Array<Record<string, unknown>>;
} {
  const isStaff =
    params.actorRole === 'STAFF' || params.actorRole === 'ADMIN';
  if (isStaff && params.includeAllDrafts !== false) {
    return { OR: [{}] };
  }
  return {
    OR: [
      { status: 'CONFIRMED' },
      { createdByUserId: params.actorUserId },
      {
        memberships: {
          some: { userId: params.actorUserId },
        },
      },
    ],
  };
}

/** Staff/admin may confirm clubs and toggle digest; students may not. */
export function canModerateClubs(actorRole: string): boolean {
  return actorRole === 'STAFF' || actorRole === 'ADMIN';
}
