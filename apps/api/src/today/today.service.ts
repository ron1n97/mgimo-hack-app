import { Injectable } from '@nestjs/common';
import { GradesService } from '../grades/grades.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from '../requests/requests.service';
import { ScheduleService } from '../schedule/schedule.service';

function todayUtcDateString(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Injectable()
export class TodayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedule: ScheduleService,
    private readonly grades: GradesService,
    private readonly requests: RequestsService,
    private readonly notifications: NotificationsService,
  ) {}

  async forUser(userId: string) {
    const day = todayUtcDateString();
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    const [lessons, allGrades, tickets, notifs] = await Promise.all([
      profile
        ? this.schedule.forUser(userId, day, day)
        : Promise.resolve([]),
      this.grades.forUser(userId),
      this.requests.listOwn(userId),
      this.notifications.forUser(userId),
    ]);

    const debts = allGrades.filter((g) => g.isDebt);
    const openTickets = tickets.filter(
      (t) => t.status === 'SUBMITTED' || t.status === 'IN_PROGRESS',
    );
    const unread = notifs.filter((n) => !n.readAt);

    return {
      date: day,
      profile,
      schedule: lessons,
      academicRisk: {
        debtCount: debts.length,
        debts,
      },
      openRequests: openTickets.slice(0, 5),
      unreadNotifications: unread.slice(0, 5),
      disclaimer:
        'Неофициальный кабинет. Расписание — из открытого RUZ МГИМО.',
    };
  }
}
