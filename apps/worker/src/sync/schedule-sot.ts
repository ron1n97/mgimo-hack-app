/**
 * Schedule source-of-truth vs RUZ.
 *
 * Rule:
 * - If our DB already has ScheduleLesson rows for groupRuzId + date range and
 *   they look "owned/complete" → DB is SoT; do not casually re-pull/overwrite.
 * - If count is 0 → miss: pull from RUZ (create).
 * - If rows exist but none have subGroupOid yet (legacy import before parallel
 *   discriminators) → allow enrichment pull; still never touch LOCAL rows.
 * - Per-row: never update LOCAL; allow create; allow RUZ enrichment when the
 *   stored row still has null subGroupOid.
 */

export type ScheduleLessonSource = 'RUZ' | 'LOCAL';

export type ExistingLessonGate = {
  source: ScheduleLessonSource;
  subGroupOid?: string | null;
};

/** Group+range: skip when coverage exists and discriminators are already present (or N/A). */
export function shouldSkipGroupRuzSync(
  localLessonCountInRange: number,
  lessonsWithSubGroupOid = 0,
): boolean {
  if (localLessonCountInRange <= 0) return false;
  // Legacy rows without any subgroup oid → allow one enrichment pass.
  if (lessonsWithSubGroupOid <= 0) return false;
  return true;
}

/**
 * Per-row upsert gate.
 * - no row → create
 * - LOCAL → never overwrite
 * - RUZ with null subGroupOid → allow update (fill discriminators)
 * - otherwise → skip (DB SoT)
 */
export function shouldApplyRuzLessonUpsert(
  existing: ExistingLessonGate | ScheduleLessonSource | null | undefined,
): 'create' | 'update' | 'skip' {
  if (existing == null) return 'create';
  const gate: ExistingLessonGate =
    typeof existing === 'string' ? { source: existing } : existing;
  if (gate.source === 'LOCAL') return 'skip';
  if (gate.source === 'RUZ' && (gate.subGroupOid == null || gate.subGroupOid === '')) {
    return 'update';
  }
  return 'skip';
}
