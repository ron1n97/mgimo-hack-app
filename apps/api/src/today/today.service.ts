import { Injectable } from '@nestjs/common';
import { GradesService } from '../grades/grades.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from '../requests/requests.service';
import { ScheduleService } from '../schedule/schedule.service';

function moscowDateString(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function moscowMinutesNow(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function beginToMinutes(begin: string): number {
  const [h, m] = begin.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
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
    const day = moscowDateString();
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

    const sorted = [...lessons].sort((a, b) =>
      String(a.begin).localeCompare(String(b.begin)),
    );
    const nowMin = moscowMinutesNow();
    const nextLesson =
      sorted.find((l) => beginToMinutes(String(l.begin)) >= nowMin) ??
      sorted[0] ??
      null;

    const debts = allGrades.filter((g) => g.isDebt);
    const openTickets = tickets.filter(
      (t) => t.status === 'SUBMITTED' || t.status === 'IN_PROGRESS',
    );
    const unread = notifs.filter((n) => !n.readAt);

    return {
      date: day,
      profile,
      schedule: sorted,
      nextLesson,
      academicRisk: {
        debtCount: debts.length,
        debts,
      },
      recentGrades: allGrades.slice(0, 8),
      openRequests: openTickets.slice(0, 5),
      unreadNotifications: unread.slice(0, 5),
      disclaimer:
        'Неофициальный кабинет. Расписание — из открытого RUZ МГИМО.',
    };
  }
}
