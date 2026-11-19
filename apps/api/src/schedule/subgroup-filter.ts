import type { Prisma } from '@prisma/client';

export type SubGroupLessonLike = {
  subGroupOid?: string | null;
};

function isWholeGroupLesson(lesson: SubGroupLessonLike): boolean {
  return lesson.subGroupOid == null || lesson.subGroupOid === '';
}

/**
 * Personalization filter for language/stream parallels within one academic group.
 * Whole-group lessons (no subGroupOid) always pass.
 * Students never see other subgroups: without preference → only whole-group;
 * with preference → whole-group + preferred oids. showAll is staff-only.
 */
export function matchesPreferredSubGroups(
  lesson: SubGroupLessonLike,
  preferredOids: string[] | null | undefined,
  showAll = false,
): boolean {
  if (showAll) return true;
  if (isWholeGroupLesson(lesson)) return true;
  if (!preferredOids?.length) return false;
  return preferredOids.includes(String(lesson.subGroupOid));
}

/** Prisma where fragment. */
export function buildSubGroupFilter(
  preferredOids: string[] | null | undefined,
  showAll = false,
): Prisma.ScheduleLessonWhereInput | undefined {
  if (showAll) return undefined;
  if (!preferredOids?.length) {
    // Hide all language/stream parallels until deanery sets preferredSubGroupOids.
    return {
      OR: [{ subGroupOid: null }, { subGroupOid: '' }],
    };
  }
  return {
    OR: [
      { subGroupOid: null },
      { subGroupOid: '' },
      { subGroupOid: { in: preferredOids.map(String) } },
    ],
  };
}
