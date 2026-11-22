import { Injectable, NotFoundException } from '@nestjs/common';
import { assertResourceOwner } from '../common/ownership';
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

  async getForUser(id: string, actorUserId: string, actorRole: string) {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    assertResourceOwner({
      resourceOwnerId: row.userId,
      actorUserId,
      actorRole,
      notFoundMessage: 'Notification not found',
    });
    return row;
  }

  /** Open card → mark viewed. Idempotent. */
  async markRead(id: string, actorUserId: string, actorRole: string) {
    const row = await this.getForUser(id, actorUserId, actorRole);
    if (row.readAt) return row;
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
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
