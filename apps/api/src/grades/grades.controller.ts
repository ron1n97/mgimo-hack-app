import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateGradeDto } from './dto/create-grade.dto';
import { GradesService } from './grades.service';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private readonly grades: GradesService) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayloadUser) {
    return this.grades.forUser(user.userId);
  }

  /** Grades + debts + open teacher tasks (ADR 0019). */
  @Get('me/overview')
  overview(@CurrentUser() user: JwtPayloadUser) {
    return this.grades.overviewForUser(user.userId);
  }

  /** Grade must be attached to a concrete pair. */
  @Post()
  @Roles(Role.TEACHER, Role.STAFF, Role.ADMIN)
  create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateGradeDto,
  ) {
    return this.grades.createForLesson(user.userId, dto);
  }
}
