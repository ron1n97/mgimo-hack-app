import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildScheduleDateFilter } from '../schedule/schedule-date-filter';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { CreateLessonTaskDto } from './dto/create-lesson-task.dto';
import { UpdateLessonTaskDto } from './dto/update-lesson-task.dto';
import { assertTeacherOwnsResource } from './teacher-access';

@Injectable()
export class TeacherAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTeachers() {
    return this.prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        email: true,
        teacherProfile: true,
      },
      orderBy: { email: 'asc' },
    });
  }

  async listAssignments() {
    return this.prisma.lessonTeacherAssignment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: true,
        scheduleLesson: true,
        assignedBy: { select: { id: true, email: true } },
        _count: { select: { tasks: true } },
      },
    });
  }

  async assignTeacher(actorUserId: string, dto: AssignTeacherDto) {
    if (!dto.scheduleLessonId && !(dto.groupRuzId && dto.discipline)) {
      throw new BadRequestException(
        'Provide scheduleLessonId or groupRuzId+discipline',
      );
    }

    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId: dto.teacherUserId },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    let groupRuzId = dto.groupRuzId ?? null;
    let groupLabel = dto.groupLabel ?? null;
    let discipline = dto.discipline ?? null;
    let scheduleLessonId = dto.scheduleLessonId ?? null;

    if (scheduleLessonId) {
      const lesson = await this.prisma.scheduleLesson.findUnique({
        where: { id: scheduleLessonId },
      });
      if (!lesson) {
        throw new NotFoundException('Schedule lesson not found');
      }
      groupRuzId = lesson.groupRuzId;
      groupLabel = lesson.groupLabel;
      discipline = lesson.discipline;
    }

    return this.prisma.lessonTeacherAssignment.create({
      data: {
        teacherUserId: dto.teacherUserId,
        scheduleLessonId,
        groupRuzId,
        groupLabel,
        discipline,
        assignedByUserId: actorUserId,
      },
      include: {
        teacher: true,
        scheduleLesson: true,
      },
    });
  }

  async removeAssignment(id: string) {
    const existing = await this.prisma.lessonTeacherAssignment.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Assignment not found');
    }
    await this.prisma.lessonTeacherAssignment.delete({ where: { id } });
    return { ok: true };
  }

  /** Teacher: resolved RUZ slots for my assignments. */
  async listMySlots(teacherUserId: string, from?: string, to?: string) {
    const assignments = await this.prisma.lessonTeacherAssignment.findMany({
      where: { teacherUserId },
      include: { scheduleLesson: true, tasks: true },
      orderBy: { createdAt: 'desc' },
    });

    const dateFilter = this.safeDateFilter(from, to);
    const slots: Array<{
      assignmentId: string;
      lesson: {
        id: string;
        date: Date;
        begin: string;
        end: string;
        discipline: string;
        groupRuzId: string;
        groupLabel: string;
        lecturer: string | null;
        auditorium: string | null;
        building: string | null;
        kindOfWork: string | null;
      };
      taskCount: number;
    }> = [];

    for (const a of assignments) {
      if (a.scheduleLesson) {
        const lesson = a.scheduleLesson;
        if (dateFilter && !this.lessonInDateFilter(lesson.date, dateFilter)) {
          continue;
        }
        slots.push({
          assignmentId: a.id,
          lesson: {
            id: lesson.id,
            date: lesson.date,
            begin: lesson.begin,
            end: lesson.end,
            discipline: lesson.discipline,
            groupRuzId: lesson.groupRuzId,
            groupLabel: lesson.groupLabel,
            lecturer: lesson.lecturer,
            auditorium: lesson.auditorium,
            building: lesson.building,
            kindOfWork: lesson.kindOfWork,
          },
          taskCount: a.tasks.length,
        });
        continue;
      }

      if (a.groupRuzId && a.discipline) {
        const where: Prisma.ScheduleLessonWhereInput = {
          groupRuzId: a.groupRuzId,
          discipline: a.discipline,
          ...(dateFilter ? { date: dateFilter } : {}),
        };
        const lessons = await this.prisma.scheduleLesson.findMany({
          where,
          orderBy: [{ date: 'asc' }, { begin: 'asc' }],
        });
        for (const lesson of lessons) {
          slots.push({
            assignmentId: a.id,
            lesson: {
              id: lesson.id,
              date: lesson.date,
              begin: lesson.begin,
              end: lesson.end,
              discipline: lesson.discipline,
              groupRuzId: lesson.groupRuzId,
              groupLabel: lesson.groupLabel,
              lecturer: lesson.lecturer,
              auditorium: lesson.auditorium,
              building: lesson.building,
              kindOfWork: lesson.kindOfWork,
            },
            taskCount: a.tasks.length,
          });
        }
      }
    }

    slots.sort((x, y) => {
      const d = x.lesson.date.getTime() - y.lesson.date.getTime();
      if (d !== 0) return d;
      return x.lesson.begin.localeCompare(y.lesson.begin);
    });

    return { assignments, slots };
  }

  async listMyTasks(teacherUserId: string) {
    return this.prisma.lessonTask.findMany({
      where: { createdByUserId: teacherUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        assignment: {
          include: { scheduleLesson: true },
        },
      },
    });
  }

  async createTask(
    actorUserId: string,
    actorRole: string,
    dto: CreateLessonTaskDto,
  ) {
    const assignment = await this.prisma.lessonTeacherAssignment.findUnique({
      where: { id: dto.assignmentId },
      include: { scheduleLesson: true },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    assertTeacherOwnsResource({
      ownerTeacherUserId: assignment.teacherUserId,
      actorUserId,
      actorRole,
      notFoundMessage: 'Assignment not found',
    });

    const scheduleLessonId =
      assignment.scheduleLessonId ?? assignment.scheduleLesson?.id ?? null;
    if (!scheduleLessonId) {
      throw new BadRequestException(
        'Задание можно создать только к конкретной паре (нужен scheduleLessonId у назначения)',
      );
    }
    const groupRuzId =
      assignment.groupRuzId ??
      assignment.scheduleLesson?.groupRuzId ??
      null;
    if (!groupRuzId) {
      throw new BadRequestException('Assignment has no groupRuzId');
    }

    return this.prisma.lessonTask.create({
      data: {
        assignmentId: assignment.id,
        title: dto.title.trim(),
        body: dto.body.trim(),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        groupRuzId,
        scheduleLessonId,
        createdByUserId: actorUserId,
      },
    });
  }

  async updateTask(
    taskId: string,
    actorUserId: string,
    actorRole: string,
    dto: UpdateLessonTaskDto,
  ) {
    const task = await this.prisma.lessonTask.findUnique({
      where: { id: taskId },
      include: { assignment: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    assertTeacherOwnsResource({
      ownerTeacherUserId: task.assignment.teacherUserId,
      actorUserId,
      actorRole,
      notFoundMessage: 'Task not found',
    });

    return this.prisma.lessonTask.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
        ...(dto.dueAt !== undefined
          ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }
          : {}),
      },
    });
  }

  async deleteTask(taskId: string, actorUserId: string, actorRole: string) {
    const task = await this.prisma.lessonTask.findUnique({
      where: { id: taskId },
      include: { assignment: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    assertTeacherOwnsResource({
      ownerTeacherUserId: task.assignment.teacherUserId,
      actorUserId,
      actorRole,
      notFoundMessage: 'Task not found',
    });

    await this.prisma.lessonTask.delete({ where: { id: taskId } });
    return { ok: true };
  }

  /** Student: tasks for my group (optionally today only). */
  async listStudentTasks(studentUserId: string, todayOnly = false) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentUserId },
    });
    if (!profile?.groupRuzId) {
      return [];
    }

    const where: Prisma.LessonTaskWhereInput = {
      groupRuzId: profile.groupRuzId,
    };

    if (todayOnly) {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      where.OR = [
        { dueAt: { gte: start, lt: end } },
        {
          dueAt: null,
          createdAt: { gte: start, lt: end },
        },
      ];
    }

    return this.prisma.lessonTask.findMany({
      where,
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignment: {
          select: {
            discipline: true,
            groupLabel: true,
            scheduleLesson: {
              select: {
                date: true,
                begin: true,
                end: true,
                discipline: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            teacherProfile: { select: { fullName: true } },
          },
        },
      },
    });
  }

  private safeDateFilter(from?: string, to?: string) {
    if (!from && !to) return undefined;
    try {
      return buildScheduleDateFilter(from, to);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid date range',
      );
    }
  }

  private lessonInDateFilter(
    date: Date,
    filter: Prisma.DateTimeFilter,
  ): boolean {
    const t = date.getTime();
    if (filter.gte instanceof Date && t < filter.gte.getTime()) return false;
    if (filter.lte instanceof Date && t > filter.lte.getTime()) return false;
    if (filter.gt instanceof Date && t <= filter.gt.getTime()) return false;
    if (filter.lt instanceof Date && t >= filter.lt.getTime()) return false;
    return true;
  }
}
