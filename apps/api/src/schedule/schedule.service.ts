import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildScheduleDateFilter } from './schedule-date-filter';
import { buildSubGroupFilter } from './subgroup-filter';

@Injectable()
export class ScheduleService {
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
      return this.findByGroupRuzId(ruzId, from, to, preferred, showAll);
    }

    // STAFF / ADMIN: schedule oversight via selected catalog group
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
    // Staff view: always full group (no personal subgroup enrollment filter)
    return this.findByGroupRuzId(ruzId, from, to, [], true);
  }

  async forGroup(ruzId: string, from?: string, to?: string) {
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
