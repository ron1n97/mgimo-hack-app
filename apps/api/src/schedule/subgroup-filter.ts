import type { Prisma } from '@prisma/client';

export type SubGroupLessonLike = {
  subGroupOid?: string | null;
};

/** RUZ often stores whole-group as "0" (not null). */
export function isWholeGroupLesson(lesson: SubGroupLessonLike): boolean {
  const oid = lesson.subGroupOid;
  return oid == null || oid === '' || oid === '0';
}

/** True when oid is a real language/stream parallel (not whole-group marker). */
export function isCatalogLanguageSubGroup(lesson: SubGroupLessonLike): boolean {
  return !isWholeGroupLesson(lesson);
}

/**
 * One student ∈ one language subgroup (timetable model A2).
 * Keep first non-empty / non-"0" oid; drop the rest.
 */
export function normalizePreferredSubGroupOids(
  oids: string[] | null | undefined,
): string[] {
  if (!oids?.length) return [];
  for (const raw of oids) {
    const oid = String(raw ?? '').trim();
    if (oid && oid !== '0') return [oid];
  }
  return [];
}

/**
 * Personalization filter for language/stream parallels within one academic group.
 * Whole-group lessons (no subGroupOid / "0") always pass.
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
  const whole: Prisma.ScheduleLessonWhereInput[] = [
    { subGroupOid: null },
    { subGroupOid: '' },
    { subGroupOid: '0' },
  ];
  if (!preferredOids?.length) {
    // Hide language/stream parallels until deanery sets preferredSubGroupOids.
    return { OR: whole };
  }
  return {
    OR: [...whole, { subGroupOid: { in: preferredOids.map(String) } }],
  };
}
