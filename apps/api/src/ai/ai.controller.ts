import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import {
  DraftRequestDto,
  ExplainNotificationDto,
  NextActionsDto,
} from './dto/ai.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('draft-request')
  draftRequest(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: DraftRequestDto,
  ) {
    return this.ai.draftRequest(user.userId, dto);
  }

  @Post('next-actions')
  nextActions(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: NextActionsDto,
  ) {
    return this.ai.nextActions(user.userId, dto);
  }

  @Post('explain-notification')
  explain(@Body() dto: ExplainNotificationDto) {
    return this.ai.explainNotification(dto);
  }
}
