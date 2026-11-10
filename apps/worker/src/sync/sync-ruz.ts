import { RuzClient, sleep, type RuzGroupHit } from '../ruz/client';
import { currentAndNextWeekRange } from '../ruz/dates';
import { buildSearchTerms } from '../ruz/search-terms';
import { getPrisma, disconnectPrisma } from '../db';
import { shouldSkipGroupRuzSync } from './schedule-sot';
import { countLessonsInRange, upsertLessonsBatch } from './upsert';

export type SyncOptions = {
  baseUrl?: string;
  /** When true, skip Prisma and return collected payload (caller may write JSON). */
  dryRun?: boolean;
  /** Delay between RUZ requests to be polite */
  requestDelayMs?: number;
  /** Extra search terms beyond defaults */
  extraTerms?: string[];
  /** Cap groups for smoke tests */
  maxGroups?: number;
  /**
   * Force RUZ pull even when local coverage exists.
   * Still create-only per row (never overwrites existing lessons).
   */
  forcePull?: boolean;
};

export type SyncResult = {
  groupsFound: number;
  groupsSynced: number;
  groupsSkipped: number;
  lessonsUpserted: number;
  errors: string[];
  dryRunPayload?: {
    groups: RuzGroupHit[];
    schedules: Record<string, unknown[]>;
  };
};

/**
 * Full RUZ → Postgres sync:
 * 1) search groups by prefixes / short terms
 * 2) for each group: if DB already has lessons in the sync window → skip (SoT)
 * 3) otherwise pull schedule and create-only upsert
 */
export async function syncRuz(options: SyncOptions = {}): Promise<SyncResult> {
  const baseUrl = options.baseUrl ?? process.env.RUZ_BASE_URL ?? 'https://ruz.mgimo.ru';
  const delay = options.requestDelayMs ?? 150;
  const dryRun = options.dryRun ?? process.env.RUZ_SYNC_DRY_RUN === '1';
  const forcePull = options.forcePull ?? process.env.RUZ_SYNC_FORCE === '1';
  const client = new RuzClient(baseUrl);
  const terms = buildSearchTerms(options.extraTerms);
  const range = currentAndNextWeekRange();

  const groupMap = new Map<string, RuzGroupHit>();
  const errors: string[] = [];

  for (const term of terms) {
    try {
      const hits = await client.searchGroups(term);
      for (const hit of hits) {
        groupMap.set(String(hit.id), hit);
      }
    } catch (err) {
      errors.push(`search(${term}): ${String(err)}`);
    }
    await sleep(delay);
  }

  let groups = [...groupMap.values()];
  if (options.maxGroups != null) {
    groups = groups.slice(0, options.maxGroups);
  }

  const schedules: Record<string, unknown[]> = {};
  let lessonsUpserted = 0;
  let groupsSynced = 0;
  let groupsSkipped = 0;

  let prisma: ReturnType<typeof getPrisma> | null = null;
  if (!dryRun) {
    try {
      prisma = getPrisma();
      // cheap connectivity check
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      errors.push(
        `Prisma unavailable (${String(err)}). Falling back to dry-run collection. TODO: run pnpm db:generate && ensure DATABASE_URL.`,
      );
      prisma = null;
    }
  }

  for (const group of groups) {
    const groupId = String(group.id);
    const label = group.label ?? groupId;
    try {
      if (prisma && !forcePull) {
        const localCount = await countLessonsInRange(
          prisma,
          groupId,
          range.start,
          range.finish,
        );
        if (shouldSkipGroupRuzSync(localCount)) {
          groupsSkipped += 1;
          continue;
        }
      }

      const lessons = await client.scheduleForGroup(
        groupId,
        range.startStr,
        range.finishStr,
      );
      schedules[groupId] = lessons;

      if (prisma) {
        lessonsUpserted += await upsertLessonsBatch(
          prisma,
          groupId,
          label,
          lessons,
        );
      }
      groupsSynced += 1;
    } catch (err) {
      errors.push(`schedule(${groupId}): ${String(err)}`);
    }
    await sleep(delay);
  }

  if (prisma) {
    await disconnectPrisma();
  }

  return {
    groupsFound: groupMap.size,
    groupsSynced,
    groupsSkipped,
    lessonsUpserted,
    errors,
    dryRunPayload:
      dryRun || !prisma
        ? { groups, schedules }
        : undefined,
  };
}
