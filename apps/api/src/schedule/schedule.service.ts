import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildScheduleDateFilter } from './schedule-date-filter';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string, from?: string, to?: string, groupRuzId?: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    const ruzId = groupRuzId ?? profile.groupRuzId;
    if (!ruzId) {
      // Fall back to groupLabel match when RUZ id unknown
      return this.findByGroupLabel(profile.groupLabel, from, to);
    }
    return this.findByGroupRuzId(ruzId, from, to);
  }

  async forGroup(ruzId: string, from?: string, to?: string) {
    return this.findByGroupRuzId(ruzId, from, to);
  }

  private async findByGroupRuzId(groupRuzId: string, from?: string, to?: string) {
    const dateFilter = this.safeDateFilter(from, to);
    const where: Prisma.ScheduleLessonWhereInput = {
      groupRuzId,
      ...(dateFilter ? { date: dateFilter } : {}),
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
  ) {
    const dateFilter = this.safeDateFilter(from, to);
    return this.prisma.scheduleLesson.findMany({
      where: {
        groupLabel,
        ...(dateFilter ? { date: dateFilter } : {}),
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
