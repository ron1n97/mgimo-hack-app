import {
  Body,
  Controller,
  Header,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { ChatDto } from './dto/chat.dto';
import { ExportDocxDto } from './dto/export-docx.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat')
  chat(@CurrentUser() user: JwtPayloadUser, @Body() dto: ChatDto) {
    return this.ai.chat(user.userId, user.role, dto);
  }

  @Post('draft-request')
  draftRequest(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: DraftRequestDto,
  ) {
    return this.ai.draftRequest(user.userId, dto);
  }

  @Post('export-docx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  async exportDocx(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: ExportDocxDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { filename, buffer } = await this.ai.exportDocx(user.userId, dto);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    return new StreamableFile(buffer);
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
