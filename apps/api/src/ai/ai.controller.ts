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

  /** NDJSON harness stream: step / assistant / done lines. */
  @Post('chat/stream')
  async chatStream(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const write = (event: unknown) => {
      res.write(`${JSON.stringify(event)}\n`);
      const flushable = res as Response & { flush?: () => void };
      flushable.flush?.();
    };

    try {
      await this.ai.chatStream(user.userId, user.role, dto, write);
    } catch {
      write({
        type: 'assistant',
        content: 'Не удалось получить ответ ассистента.',
        parts: [{ type: 'text', text: 'Не удалось получить ответ ассистента.' }],
        widgets: [],
        source: 'stub',
        disclaimer: 'Ошибка потока ИИ.',
        steps: [],
      });
      write({ type: 'done' });
    } finally {
      res.end();
    }
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
