import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildScheduleDateFilter, parseDateOnly } from './schedule-date-filter';
import { ensureGroupScheduleFromRuz, defaultSyncRange } from './ruz-lazy-pull';
import { buildSubGroupFilter } from './subgroup-filter';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async forUser(
    userId: string,
    from?: string,
    to?: string,
    groupRuzId?: string,
    showAll = false,
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (student) {
      const ruzId = groupRuzId ?? student.groupRuzId;
      const preferred = student.preferredSubGroupOids ?? [];
      if (!ruzId) {
        return this.findByGroupLabel(
          student.groupLabel,
          from,
          to,
          preferred,
          showAll,
        );
      }
      await this.lazyPullIfMiss(ruzId, student.groupLabel, from, to);
      return this.findByGroupRuzId(ruzId, from, to, preferred, showAll);
    }

    // STAFF / ADMIN: catalog group for schedule oversight (not enrollment)
    const staff = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staff) {
      throw new NotFoundException('Profile not found');
    }
    const ruzId = groupRuzId ?? staff.scheduleGroupRuzId;
    if (!ruzId) {
      if (staff.scheduleGroupLabel) {
        return this.findByGroupLabel(
          staff.scheduleGroupLabel,
          from,
          to,
          [],
          true,
        );
      }
      return [];
    }
    await this.lazyPullIfMiss(ruzId, staff.scheduleGroupLabel ?? undefined, from, to);
    return this.findByGroupRuzId(ruzId, from, to, [], true);
  }

  async forGroup(ruzId: string, from?: string, to?: string) {
    await this.lazyPullIfMiss(ruzId, undefined, from, to);
    return this.findByGroupRuzId(ruzId, from, to, [], true);
  }

  /** Distinct academic groups present in synced RUZ lessons. */
  async listGroups() {
    const rows = await this.prisma.scheduleLesson.findMany({
      distinct: ['groupRuzId'],
      select: { groupRuzId: true, groupLabel: true },
      orderBy: { groupLabel: 'asc' },
    });
    return rows
      .filter((r) => r.groupRuzId && r.groupLabel)
      .map((r) => ({
        groupRuzId: r.groupRuzId,
        groupLabel: r.groupLabel,
      }));
  }

  /** Distinct subGroups for an academic group (for profile picker). */
  async listSubGroups(groupRuzId: string) {
    await this.lazyPullIfMiss(groupRuzId);
    const rows = await this.prisma.scheduleLesson.findMany({
      where: {
        groupRuzId,
        subGroupOid: { not: null },
      },
      distinct: ['subGroupOid'],
      select: { subGroupOid: true, subGroup: true },
      orderBy: { subGroup: 'asc' },
    });
    return rows
      .filter((r) => r.subGroupOid)
      .map((r) => ({
        subGroupOid: r.subGroupOid as string,
        subGroup: r.subGroup ?? r.subGroupOid,
      }));
  }

  private async lazyPullIfMiss(
    groupRuzId: string,
    groupLabel?: string,
    from?: string,
    to?: string,
  ) {
    try {
      const range = this.resolvePullRange(from, to);
      await ensureGroupScheduleFromRuz(this.prisma, {
        groupRuzId,
        groupLabel,
        from: range.from,
        to: range.to,
      });
    } catch (err) {
      this.logger.warn(
        `Lazy RUZ pull failed for group=${groupRuzId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private resolvePullRange(from?: string, to?: string): {
    from: Date;
    to: Date;
  } {
    if (from && to) {
      const f = parseDateOnly(from);
      const t = parseDateOnly(to);
      if (f && t) return { from: f, to: t };
    }
    const def = defaultSyncRange();
    return { from: def.from, to: def.to };
  }

  private async findByGroupRuzId(
    groupRuzId: string,
    from?: string,
    to?: string,
    preferredOids: string[] = [],
    showAll = false,
  ) {
    const dateFilter = this.safeDateFilter(from, to);
    const subFilter = buildSubGroupFilter(preferredOids, showAll);
    const where: Prisma.ScheduleLessonWhereInput = {
      groupRuzId,
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(subFilter ?? {}),
    };
    return this.prisma.scheduleLesson.findMany({
      where,
      orderBy: [{ date: 'asc' }, { begin: 'asc' }],
    });
  }

  private async findByGroupLabel(
    groupLabel: string,
    from?: string,
    to?: string,
    preferredOids: string[] = [],
    showAll = false,
  ) {
    const dateFilter = this.safeDateFilter(from, to);
    const subFilter = buildSubGroupFilter(preferredOids, showAll);
    return this.prisma.scheduleLesson.findMany({
      where: {
        groupLabel,
        ...(dateFilter ? { date: dateFilter } : {}),
        ...(subFilter ?? {}),
      },
      orderBy: [{ date: 'asc' }, { begin: 'asc' }],
    });
  }

  /**
   * Staff marks a lesson as moved/cancelled locally (LOCAL overlay flags).
   * RUZ sync does not clear LOCAL ownership; isMoved stays until cleared.
   */
  async markLessonMoved(
    lessonId: string,
    input: { isMoved?: boolean; isCancelled?: boolean; note?: string },
  ) {
    const lesson = await this.prisma.scheduleLesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Пара не найдена');
    const updated = await this.prisma.scheduleLesson.update({
      where: { id: lessonId },
      data: {
        isMoved: input.isMoved ?? true,
        isCancelled: input.isCancelled ?? lesson.isCancelled,
        source: 'LOCAL',
      },
    });
    return {
      lesson: updated,
      notifyHint: {
        title: input.isCancelled
          ? `Отмена: ${lesson.discipline}`
          : `Перенос: ${lesson.discipline}`,
        body:
          input.note?.trim() ||
          `${lesson.groupLabel} · ${String(lesson.date).slice(0, 10)} ${lesson.begin}–${lesson.end}` +
            (lesson.auditorium ? ` · ауд. ${lesson.auditorium}` : ''),
        kind: 'schedule_moved' as const,
        groupRuzId: lesson.groupRuzId,
      },
    };
  }

  private safeDateFilter(from?: string, to?: string) {
    try {
      return buildScheduleDateFilter(from, to);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid date range',
      );
    }
  }
}
