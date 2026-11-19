import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { MarkMovedDto } from './dto/mark-moved.dto';
import { ScheduleService } from './schedule.service';

function parseShowAll(raw?: string): boolean {
  if (raw == null || raw === '') return false;
  return raw === '1' || raw.toLowerCase() === 'true' || raw === 'yes';
}

@Controller('schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleController {
  constructor(
    private readonly schedule: ScheduleService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('groups')
  groups() {
    return this.schedule.listGroups();
  }

  @Get('groups/:ruzId/subgroups')
  subGroups(@Param('ruzId') ruzId: string) {
    return this.schedule.listSubGroups(ruzId);
  }

  @Get('me')
  me(
    @CurrentUser() user: JwtPayloadUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupRuzId') groupRuzId?: string,
    @Query('showAll') showAll?: string,
  ) {
    return this.schedule.forUser(
      user.userId,
      from,
      to,
      groupRuzId,
      parseShowAll(showAll),
    );
  }

  @Get('groups/:ruzId')
  byGroup(
    @Param('ruzId') ruzId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.schedule.forGroup(ruzId, from, to);
  }

  /** Deanery: mark pair moved/cancelled + notify students of that group. */
  @Patch('lessons/:id/move')
  @Roles(Role.STAFF, Role.ADMIN)
  async markMoved(@Param('id') id: string, @Body() dto: MarkMovedDto) {
    const result = await this.schedule.markLessonMoved(id, dto);
    const delivery = await this.notifications.announceToStudents({
      title: result.notifyHint.title,
      body: result.notifyHint.body,
      kind: result.notifyHint.kind,
      groupRuzId: result.notifyHint.groupRuzId,
    });
    return { lesson: result.lesson, notified: delivery.count };
  }
}
