import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ScheduleService } from './schedule.service';

function parseShowAll(raw?: string): boolean {
  if (raw == null || raw === '') return false;
  return raw === '1' || raw.toLowerCase() === 'true' || raw === 'yes';
}

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

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
}
