import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Notification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { shouldSendWebPush } from './push-kinds';

export type PushSendResult = { statusCode?: number };

export type WebPushSender = (input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  payload: string;
  vapid: { publicKey: string; privateKey: string; subject: string };
}) => Promise<PushSendResult>;

export type DispatchResult = {
  sent: number;
  skipped?: 'no_vapid' | 'kind' | 'no_subs';
};

async function defaultWebPushSend(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  payload: string;
  vapid: { publicKey: string; privateKey: string; subject: string };
}): Promise<PushSendResult> {
  // Lazy require so unit tests can inject a fake without installing side effects.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const webpush = require('web-push') as typeof import('web-push');
  webpush.setVapidDetails(
    input.vapid.subject,
    input.vapid.publicKey,
    input.vapid.privateKey,
  );
  const res = await webpush.sendNotification(
    {
      endpoint: input.endpoint,
      keys: { p256dh: input.keys.p256dh, auth: input.keys.auth },
    },
    input.payload,
  );
  return { statusCode: res.statusCode };
}

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);
  private sendWebPush: WebPushSender = defaultWebPushSend;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Test seam — production always uses default web-push sender. */
  useSender(sender: WebPushSender) {
    this.sendWebPush = sender;
  }

  private vapidConfig():
    | { publicKey: string; privateKey: string; subject: string }
    | null {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const subject =
      this.config.get<string>('VAPID_SUBJECT')?.trim() ||
      'mailto:demo@dekanat.local';
    if (!publicKey || !privateKey) return null;
    return { publicKey, privateKey, subject };
  }

  async dispatch(notification: Notification): Promise<DispatchResult> {
    if (!shouldSendWebPush(notification.kind)) {
      return { sent: 0, skipped: 'kind' };
    }

    const vapid = this.vapidConfig();
    if (!vapid) {
      return { sent: 0, skipped: 'no_vapid' };
    }

    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId: notification.userId },
    });
    if (subs.length === 0) {
      return { sent: 0, skipped: 'no_subs' };
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      kind: notification.kind,
      url: `/notifications/${notification.id}`,
      notificationId: notification.id,
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await this.sendWebPush({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapid,
        });
        sent += 1;
      } catch (err) {
        const statusCode =
          typeof err === 'object' &&
          err !== null &&
          'statusCode' in err &&
          typeof (err as { statusCode: unknown }).statusCode === 'number'
            ? (err as { statusCode: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await this.prisma.pushSubscription.deleteMany({
            where: { endpoint: sub.endpoint },
          });
        } else {
          this.logger.warn(
            `Web Push failed for ${sub.id}: ${String(err)}`,
          );
        }
      }
    }

    return { sent };
  }
}
