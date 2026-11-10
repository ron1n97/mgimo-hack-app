import type { Prisma } from '@prisma/client';

export type SubGroupLessonLike = {
  subGroupOid?: string | null;
};

/**
 * Personalization filter for language/stream parallels within one academic group.
 * Lessons without subGroupOid apply to the whole group and always pass.
 */
export function matchesPreferredSubGroups(
  lesson: SubGroupLessonLike,
  preferredOids: string[] | null | undefined,
  showAll = false,
): boolean {
  if (showAll || !preferredOids?.length) return true;
  if (lesson.subGroupOid == null || lesson.subGroupOid === '') return true;
  return preferredOids.includes(String(lesson.subGroupOid));
}

/** Prisma where fragment; undefined means no extra filter. */
export function buildSubGroupFilter(
  preferredOids: string[] | null | undefined,
  showAll = false,
): Prisma.ScheduleLessonWhereInput | undefined {
  if (showAll || !preferredOids?.length) return undefined;
  return {
    OR: [
      { subGroupOid: null },
      { subGroupOid: { in: preferredOids.map(String) } },
    ],
  };
}
