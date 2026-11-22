import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClubStatus, Role } from '@prisma/client';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import {
  ConfirmClubDto,
  CreateDigestSourceDto,
  DigestToggleDto,
  ModerateEventDto,
  SetTagSubscriptionsDto,
  StaffCreateClubDto,
} from './dto/staff-club.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClubsController {
  constructor(private readonly clubs: ClubsService) {}

  @Get('tags')
  listTags() {
    return this.clubs.listTags();
  }

  @Get('clubs')
  listClubs(
    @CurrentUser() user: JwtPayloadUser,
    @Query('tag') tag?: string,
    @Query('q') q?: string,
    @Query('status') status?: ClubStatus,
  ) {
    return this.clubs.listClubs({
      actorUserId: user.userId,
      actorRole: user.role,
      tag,
      q,
      status,
    });
  }

  @Get('clubs/:id')
  getClub(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.clubs.getClub(id, user.userId, user.role);
  }

  @Post('clubs')
  @Roles(Role.STUDENT, Role.STAFF, Role.ADMIN)
  createClub(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateClubDto,
  ) {
    return this.clubs.createClub(user.userId, dto);
  }

  @Get('me/interests')
  getInterests(@CurrentUser() user: JwtPayloadUser) {
    return this.clubs.getInterests(user.userId);
  }

  @Put('me/interests/tags')
  setTagSubscriptions(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: SetTagSubscriptionsDto,
  ) {
    return this.clubs.setTagSubscriptions(user.userId, dto);
  }

  @Post('me/subscriptions/clubs/:id')
  subscribeClub(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.clubs.subscribeClub(user.userId, id);
  }

  @Delete('me/subscriptions/clubs/:id')
  unsubscribeClub(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.clubs.unsubscribeClub(user.userId, id);
  }

  @Get('digest/feed')
  digestFeed(
    @CurrentUser() user: JwtPayloadUser,
    @Query('filter') filter?: string,
  ) {
    return this.clubs.listDigestFeed({
      actorUserId: user.userId,
      personalized: filter === 'subscribed' || filter === 'interests',
    });
  }

  @Post('staff/clubs')
  @Roles(Role.STAFF, Role.ADMIN)
  staffCreate(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: StaffCreateClubDto,
  ) {
    return this.clubs.staffCreateClub(user.userId, dto);
  }

  @Patch('staff/clubs/:id/confirm')
  @Roles(Role.STAFF, Role.ADMIN)
  confirm(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: ConfirmClubDto,
  ) {
    return this.clubs.confirmClub(id, user.userId, user.role, dto);
  }

  @Patch('staff/clubs/:id/digest')
  @Roles(Role.STAFF, Role.ADMIN)
  setDigest(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: DigestToggleDto,
  ) {
    return this.clubs.setDigest(id, user.role, dto);
  }

  @Post('staff/digest-sources')
  @Roles(Role.STAFF, Role.ADMIN)
  addSource(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateDigestSourceDto,
  ) {
    return this.clubs.addDigestSource(user.userId, dto);
  }

  @Get('staff/digest/pending')
  @Roles(Role.STAFF, Role.ADMIN)
  pending(@CurrentUser() user: JwtPayloadUser) {
    return this.clubs.listPendingEvents(user.role);
  }

  @Get('staff/digest/events')
  @Roles(Role.STAFF, Role.ADMIN)
  listEvents(
    @CurrentUser() user: JwtPayloadUser,
    @Query('status') status?: string,
  ) {
    const allowed = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const;
    const normalized = (status ?? 'ALL').toUpperCase();
    const filter = allowed.includes(normalized as (typeof allowed)[number])
      ? (normalized as (typeof allowed)[number])
      : 'ALL';
    return this.clubs.listDigestEvents(user.role, filter);
  }

  @Patch('staff/digest/events/:id')
  @Roles(Role.STAFF, Role.ADMIN)
  moderate(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: ModerateEventDto,
  ) {
    return this.clubs.moderateEvent(id, user.userId, user.role, {
      status: dto.status,
      title: dto.title,
      body: dto.body,
      startsAt: dto.startsAt,
    });
  }

  @Post('staff/digest/ingest-telegram')
  @Roles(Role.STAFF, Role.ADMIN)
  ingestTelegram(
    @CurrentUser() user: JwtPayloadUser,
    @Query('mode') mode?: string,
  ) {
    const weekly = (mode ?? '').toLowerCase() === 'weekly';
    return this.clubs.ingestTelegramDigest(
      user.role,
      weekly ? 'weekly' : 'default',
    );
  }

  /** Optional: re-run AI/heuristic on PENDING (ingest already classifies). */
  @Post('staff/digest/ai-classify')
  @Roles(Role.STAFF, Role.ADMIN)
  aiClassifyPending(@CurrentUser() user: JwtPayloadUser) {
    return this.clubs.reclassifyPendingDigest(user.role);
  }
}
