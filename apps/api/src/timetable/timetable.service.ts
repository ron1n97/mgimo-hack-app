import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateOnly } from '../schedule/schedule-date-filter';
import { buildInstanceFromLessons } from './build-instance';
import { solveTimetable } from './solve-cpsat';

@Injectable()
export class TimetableService {
  private readonly logger = new Logger(TimetableService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listRuns(take = 20) {
    return this.prisma.timetableSolveRun.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        status: true,
        engine: true,
        objective: true,
        message: true,
        groupRuzIds: true,
        fromDate: true,
        toDate: true,
        softJson: true,
        elapsedMs: true,
        createdAt: true,
        createdByUserId: true,
      },
    });
  }

  async getRun(id: string) {
    return this.prisma.timetableSolveRun.findUnique({ where: { id } });
  }

  async solve(
    actorUserId: string,
    input: {
      groupRuzIds: string[];
      from: string;
      to: string;
      engine?: 'auto' | 'cpsat' | 'heuristic';
    },
  ) {
    const groups = [...new Set(input.groupRuzIds.map((g) => g.trim()).filter(Boolean))];
    if (!groups.length) {
      throw new BadRequestException('Укажите хотя бы одну groupRuzId');
    }
    const from = parseDateOnly(input.from);
    const to = parseDateOnly(input.to);
    if (!from || !to) {
      throw new BadRequestException('from/to must be YYYY-MM-DD');
    }

    const lessons = await this.prisma.scheduleLesson.findMany({
      where: {
        groupRuzId: { in: groups },
        date: { gte: from, lte: to },
        isCancelled: false,
      },
      orderBy: [{ date: 'asc' }, { begin: 'asc' }],
      take: 80,
    });
    if (!lessons.length) {
      throw new BadRequestException('Нет пар в выбранном диапазоне для солвера');
    }

    const teachers = await this.prisma.teacherProfile.findMany({
      select: { userId: true, fullName: true, department: true },
    });

    const instance = buildInstanceFromLessons({ lessons, teachers });
    this.logger.log(
      `solve groups=${groups.join(',')} activities=${instance.activities.length} rooms=${instance.rooms.length} teachers=${instance.teachers.length}`,
    );

    const result = await solveTimetable(instance, {
      prefer: input.engine ?? 'auto',
      timeBudgetMs: 10_000,
    });

    const run = await this.prisma.timetableSolveRun.create({
      data: {
        status: result.status,
        engine: result.engine,
        objective: Number.isFinite(result.objective) ? result.objective : null,
        message: result.message ?? null,
        groupRuzIds: groups,
        fromDate: from,
        toDate: to,
        lambdasJson: instance.lambdas ?? Prisma.JsonNull,
        softJson: result.soft as unknown as Prisma.InputJsonValue,
        instanceMeta: {
          activityCount: instance.activities.length,
          roomCount: instance.rooms.length,
          teacherCount: instance.teachers.length,
          slotCount: instance.slots.length,
        },
        solutionJson: {
          assignments: result.assignments,
          activities: instance.activities.map((a) => ({
            id: a.id,
            discipline: a.discipline,
            cohortId: a.cohortId,
            sourceLessonId: a.sourceLessonId,
          })),
          slots: instance.slots,
          rooms: instance.rooms,
          teachers: instance.teachers.map((t) => ({
            id: t.id,
            name: t.name,
            dept: t.dept,
          })),
        } as unknown as Prisma.InputJsonValue,
        createdByUserId: actorUserId,
        elapsedMs: result.elapsedMs,
      },
    });

    return { run, result };
  }
}
