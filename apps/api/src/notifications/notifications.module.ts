import { Module } from '@nestjs/common';
import { NotificationDispatcher } from './notification-dispatcher';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionService } from './push-subscription.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushSubscriptionService,
    NotificationDispatcher,
  ],
  exports: [NotificationsService, NotificationDispatcher],
})
export class NotificationsModule {}
