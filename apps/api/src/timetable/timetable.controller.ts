import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SolveTimetableDto } from './dto/solve-timetable.dto';
import { TimetableService } from './timetable.service';

@Controller('timetable')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimetableController {
  constructor(private readonly timetable: TimetableService) {}

  @Get('solves')
  @Roles(Role.STAFF, Role.ADMIN)
  list() {
    return this.timetable.listRuns();
  }

  @Get('solves/:id')
  @Roles(Role.STAFF, Role.ADMIN)
  one(@Param('id') id: string) {
    return this.timetable.getRun(id);
  }

  /** Run ADR 0011 optimizer (CP-SAT if available, else heuristic). Proposal only. */
  @Post('solve')
  @Roles(Role.STAFF, Role.ADMIN)
  solve(@CurrentUser() user: JwtPayloadUser, @Body() dto: SolveTimetableDto) {
    return this.timetable.solve(user.userId, {
      groupRuzIds: dto.groupRuzIds,
      from: dto.from,
      to: dto.to,
      engine: dto.engine,
    });
  }
}
