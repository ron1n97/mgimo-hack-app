/**
 * Schedule source-of-truth vs RUZ.
 *
 * Rule:
 * - If our DB already has any ScheduleLesson for groupRuzId + date range →
 *   DB is SoT; do not pull/overwrite from RUZ for that coverage window.
 * - If count is 0 → lazy/cron pull from RUZ is allowed (create-only).
 * - Per-row: never update an existing row from RUZ (LOCAL self-planned or
 *   previously synced RUZ). New ruzExternalId keys may still be created when
 *   a miss-pull runs (empty coverage only).
 */

export type ScheduleLessonSource = 'RUZ' | 'LOCAL';

/** Group+range: any local row means skip RUZ sync for that window. */
export function shouldSkipGroupRuzSync(localLessonCountInRange: number): boolean {
  return localLessonCountInRange > 0;
}

/**
 * Per-row upsert gate. Existing rows of any source stay untouched.
 * Only create when there is no matching local lesson.
 */
export function shouldApplyRuzLessonUpsert(
  existingSource: ScheduleLessonSource | null | undefined,
): boolean {
  return existingSource == null;
}
