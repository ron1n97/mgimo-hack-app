import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcher } from './notification-dispatcher';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  async forUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async createForUser(input: {
    userId: string;
    title: string;
    body: string;
    kind: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        kind: input.kind,
      },
    });
    const delivery = await this.dispatcher.dispatch(notification);
    return { notification, delivery };
  }

  /** Broadcast deanery announcement / schedule move notice to students. */
  async announceToStudents(input: {
    title: string;
    body: string;
    kind?: string;
    /** When set, only students bound to this RUZ group. */
    groupRuzId?: string;
  }) {
    const kind = input.kind?.trim() || 'deanery_announce';
    const students = await this.prisma.user.findMany({
      where: {
        role: 'STUDENT',
        ...(input.groupRuzId
          ? { studentProfile: { groupRuzId: input.groupRuzId } }
          : {}),
      },
      select: { id: true },
    });
    const created = [];
    for (const s of students) {
      created.push(
        await this.createForUser({
          userId: s.id,
          title: input.title.trim(),
          body: input.body.trim(),
          kind,
        }),
      );
    }
    return { count: created.length, kind };
  }
}
