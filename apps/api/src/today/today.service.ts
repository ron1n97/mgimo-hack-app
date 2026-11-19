import { Injectable } from '@nestjs/common';
import { EventModerationStatus } from '@prisma/client';
import { resolveDigestEventUrl } from '../clubs/digest-event-url';
import { GradesService } from '../grades/grades.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from '../requests/requests.service';
import { ScheduleService } from '../schedule/schedule.service';
import {
  moscowDateString,
  moscowWeekBounds,
  splitClubDigestByDay,
} from './today-digest';

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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true, staffProfile: true },
    });
    const profile = user?.studentProfile ?? null;
    const hasScheduleTarget = Boolean(
      profile?.groupRuzId ||
        (profile?.groupLabel && profile.groupLabel !== 'Без группы') ||
        user?.staffProfile?.scheduleGroupRuzId ||
        user?.staffProfile?.scheduleGroupLabel,
    );

    const [lessons, allGrades, tickets, notifs] = await Promise.all([
      hasScheduleTarget
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

    const week = moscowWeekBounds(day);
    const weekStart = new Date(`${week.from}T00:00:00+03:00`);
    const weekEnd = new Date(`${week.to}T23:59:59.999+03:00`);
    const clubEvents = await this.prisma.eventCandidate.findMany({
      where: {
        moderationStatus: EventModerationStatus.APPROVED,
        startsAt: { gte: weekStart, lte: weekEnd },
      },
      // Newest first + high cap so TG ingest for ~70 clubs still fills «сегодня».
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        club: {
          select: {
            id: true,
            name: true,
            sources: { select: { url: true, kind: true }, take: 4 },
          },
        },
        source: { select: { url: true } },
      },
    });
    const mapped = clubEvents.map((e) => ({
      id: e.id,
      title: e.title,
      body: e.body,
      url: resolveDigestEventUrl({
        url: e.url,
        sourceUrl: e.source?.url,
        clubSourceUrls: e.club?.sources?.map((s) => s.url),
      }),
      imageUrl: e.imageUrl,
      startsAt: e.startsAt,
      club: e.club ? { id: e.club.id, name: e.club.name } : null,
    }));
    const buckets = splitClubDigestByDay(mapped, day);

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
      clubEventsToday: buckets.today,
      clubDigestWeek: {
        from: week.from,
        to: week.to,
        items: buckets.week,
        todayCount: buckets.today.length,
      },
      disclaimer:
        'Неофициальный кабинет. Расписание — из открытого RUZ МГИМО.',
    };
  }
}
