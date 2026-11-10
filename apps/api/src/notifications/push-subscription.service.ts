import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type PushSubscribeInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string | null;
};

@Injectable()
export class PushSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  subscribe(userId: string, input: PushSubscribeInput) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
      },
      update: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    const result = await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { removed: result.count > 0 };
  }

  listForUser(userId: string) {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
