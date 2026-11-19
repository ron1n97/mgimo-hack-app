import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Academic results only (ADR 0019). Teacher homework lives in LessonTask.
 */
@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string) {
    return this.prisma.grade.findMany({
      where: { studentUserId: userId },
      orderBy: [{ semester: 'desc' }, { discipline: 'asc' }],
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
              OR: [{ dueAt: null }, { dueAt: { gte: new Date() } }],
            },
            orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
            take: 20,
            include: {
              assignment: {
                select: { discipline: true, groupLabel: true },
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
}
