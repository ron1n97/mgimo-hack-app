import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnnounceDto } from './dto/announce.dto';
import {
  CreateNotificationDto,
  SubscribePushDto,
  UnsubscribePushDto,
} from './dto/subscribe-push.dto';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionService } from './push-subscription.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly pushSubscriptions: PushSubscriptionService,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayloadUser) {
    return this.notifications.forUser(user.userId);
  }

  @Get('me/unread-count')
  async unreadCount(@CurrentUser() user: JwtPayloadUser) {
    const count = await this.notifications.unreadCount(user.userId);
    return { count };
  }

  @Get('push/vapid-public-key')
  vapidPublicKey() {
    const key =
      this.config.get<string>('VAPID_PUBLIC_KEY')?.trim() ||
      this.config.get<string>('NEXT_PUBLIC_VAPID_PUBLIC_KEY')?.trim() ||
      '';
    return { publicKey: key };
  }

  @Post('push/subscribe')
  subscribe(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: SubscribePushDto,
  ) {
    return this.pushSubscriptions.subscribe(user.userId, {
      endpoint: dto.endpoint,
      keys: dto.keys,
      userAgent: dto.userAgent,
    });
  }

  @Delete('push/subscribe')
  unsubscribe(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: UnsubscribePushDto,
  ) {
    return this.pushSubscriptions.unsubscribe(user.userId, dto.endpoint);
  }

  /** Demo/generic create for seed-like checks; dispatches Web Push when kind matches. */
  @Post()
  create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notifications.createForUser({
      userId: user.userId,
      title: dto.title,
      body: dto.body,
      kind: dto.kind,
    });
  }

  /** Broadcast news / schedule move notice to all students (+ Web Push when VAPID set). */
  @Post('announce')
  @Roles(Role.STAFF, Role.ADMIN)
  announce(@Body() dto: AnnounceDto) {
    return this.notifications.announceToStudents({
      title: dto.title,
      body: dto.body,
      kind: dto.kind,
    });
  }
}
