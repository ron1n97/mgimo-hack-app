import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TodayService } from './today.service';

@Controller('today')
@UseGuards(JwtAuthGuard)
export class TodayController {
  constructor(private readonly today: TodayService) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayloadUser) {
    return this.today.forUser(user.userId);
  }
}
