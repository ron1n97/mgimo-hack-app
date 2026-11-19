import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';

/**
 * Academic results bound to a concrete pair (ADR 0019).
 * Teacher homework lives in LessonTask (also lesson-bound).
 */
@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string) {
    return this.prisma.grade.findMany({
      where: { studentUserId: userId },
      orderBy: [{ semester: 'desc' }, { discipline: 'asc' }],
      include: {
        scheduleLesson: {
          select: {
            id: true,
            date: true,
            begin: true,
            end: true,
            discipline: true,
            groupLabel: true,
            lecturer: true,
          },
        },
      },
    });
  }

  /** Student «как у меня дела»: grades + debts + open teacher tasks. */
  async overviewForUser(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    const [grades, openTasks] = await Promise.all([
      this.forUser(userId),
      profile?.groupRuzId
        ? this.prisma.lessonTask.findMany({
            where: {
              groupRuzId: profile.groupRuzId,
              scheduleLessonId: { not: null },
              OR: [{ dueAt: null }, { dueAt: { gte: new Date() } }],
            },
            orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
            take: 20,
            include: {
              assignment: {
                select: {
                  discipline: true,
                  groupLabel: true,
                  scheduleLessonId: true,
                  scheduleLesson: {
                    select: {
                      id: true,
                      date: true,
                      begin: true,
                      end: true,
                      discipline: true,
                    },
                  },
                },
              },
              createdBy: {
                select: { teacherProfile: { select: { fullName: true } } },
              },
            },
          })
        : Promise.resolve([]),
    ]);
    const debts = grades.filter((g) => g.isDebt);
    return {
      grades,
      debts,
      openTasks,
      summary: {
        gradeCount: grades.length,
        debtCount: debts.length,
        openTaskCount: openTasks.length,
      },
    };
  }

  /** Teacher/staff: attach a grade to a concrete ScheduleLesson. */
  async createForLesson(actorUserId: string, dto: CreateGradeDto) {
    const lesson = await this.prisma.scheduleLesson.findUnique({
      where: { id: dto.scheduleLessonId },
    });
    if (!lesson) throw new NotFoundException('Пара не найдена');

    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentUserId },
      include: { studentProfile: true },
    });
    if (!student?.studentProfile) {
      throw new NotFoundException('Студент не найден');
    }
    if (
      student.studentProfile.groupRuzId &&
      student.studentProfile.groupRuzId !== lesson.groupRuzId
    ) {
      throw new BadRequestException(
        'Студент не из группы этой пары — оценка не ставится',
      );
    }

    return this.prisma.grade.create({
      data: {
        studentUserId: dto.studentUserId,
        scheduleLessonId: lesson.id,
        discipline: lesson.discipline,
        grade: dto.grade.trim(),
        gradeType: dto.gradeType.trim(),
        semester: dto.semester.trim(),
        isDebt: Boolean(dto.isDebt),
      },
      include: {
        scheduleLesson: {
          select: {
            id: true,
            date: true,
            begin: true,
            end: true,
            discipline: true,
            groupLabel: true,
          },
        },
      },
    });
  }
}
