import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GradesService } from './grades.service';

@Controller('grades')
@UseGuards(JwtAuthGuard)
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
}
