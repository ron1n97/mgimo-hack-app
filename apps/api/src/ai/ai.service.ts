import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GradesService } from '../grades/grades.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from '../requests/requests.service';
import { ScheduleService } from '../schedule/schedule.service';
import { TodayService } from '../today/today.service';
import { completeChatTurn, type ChatStreamEvent } from './ai-chat';
import { buildApplicationDocx } from './application-docx';
import {
  ApplicationProfile,
  assembleApplicationText,
  cleanProfile,
  extractStatementBody,
} from './application-layout';
import { completeWithFallback } from './ai-complete';
import {
  DraftRequestDto,
  ExplainNotificationDto,
  NextActionsDto,
} from './dto/ai.dto';
import { ChatDto } from './dto/chat.dto';
import { ExportDocxDto } from './dto/export-docx.dto';
import { sanitizeDraftText } from './sanitize-draft';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly today: TodayService,
    private readonly schedule: ScheduleService,
    private readonly grades: GradesService,
    private readonly requests: RequestsService,
    private readonly notifications: NotificationsService,
  ) {}

  private get apiKey(): string | undefined {
    const key = this.config.get<string>('ZCODE_API_KEY');
    return key && key.trim() ? key.trim() : undefined;
  }

  private get baseUrl(): string {
    return (
      this.config.get<string>('ZCODE_BASE_URL') ??
      'https://api.z.ai/api/coding/paas/v4'
    );
  }

  private get model(): string {
    return this.config.get<string>('ZCODE_MODEL') ?? 'glm-5.3';
  }

  private profileBits(profile: {
    fullName: string;
    faculty: string;
    program: string;
    course: number;
    groupLabel: string;
  } | null): ApplicationProfile {
    if (!profile) return { fullName: 'Студент' };
    return cleanProfile(profile);
  }

  private profilePromptLine(bits: ApplicationProfile): string {
    const parts = [
      `ФИО: ${bits.fullName}`,
      bits.course ? `курс: ${bits.course}` : null,
      bits.faculty ? `факультет: ${bits.faculty}` : null,
      bits.program ? `программа: ${bits.program}` : null,
      bits.groupLabel ? `группа: ${bits.groupLabel}` : null,
    ].filter(Boolean);
    return `Данные студента (только для смысла текста, шапку документа соберёт система): ${parts.join('; ')}`;
  }

  async chat(userId: string, role: string, dto: ChatDto) {
    const result = await this.runChatTurn(userId, role, dto);
    return {
      role: 'assistant' as const,
      content: result.content,
      parts: result.parts,
      widgets: result.widgets,
      source: result.source,
      disclaimer: result.disclaimer,
      steps: result.steps,
    };
  }

  async chatStream(
    userId: string,
    role: string,
    dto: ChatDto,
    onEvent: (event: ChatStreamEvent) => void,
  ) {
    await this.runChatTurn(userId, role, dto, onEvent);
  }

  private async runChatTurn(
    userId: string,
    role: string,
    dto: ChatDto,
    onEvent?: (event: ChatStreamEvent) => void,
  ) {
    const profileHint = await this.profileHintFor(userId, role);
    return completeChatTurn({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      model: this.model,
      role,
      profileHint,
      userMessage: dto.message,
      history: dto.history,
      runTool: (name, args) => this.runChatTool(userId, role, name, args),
      stubReply: () => this.stubChatReply(role),
      logger: (msg) => this.logger.warn(msg),
      onEvent,
    });
  }

  private async profileHintFor(userId: string, role: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true, staffProfile: true },
    });
    if (!user) return `role=${role}`;
    if (user.studentProfile) {
      const p = user.studentProfile;
      return `${p.fullName}, группа ${p.groupLabel}, курс ${p.course}, role=${user.role}`;
    }
    if (user.staffProfile) {
      return `${user.staffProfile.fullName}, ${user.staffProfile.department}, role=${user.role}`;
    }
    return `role=${user.role}`;
  }

  private async runChatTool(
    userId: string,
    role: string,
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const r = role.toUpperCase();
    switch (name) {
      case 'get_today':
        return this.today.forUser(userId);
      case 'get_schedule': {
        try {
          return await this.schedule.forUser(
            userId,
            typeof args.from === 'string' ? args.from : undefined,
            typeof args.to === 'string' ? args.to : undefined,
          );
        } catch {
          return { lessons: [], note: 'Расписание доступно для студенческого профиля' };
        }
      }
      case 'get_grades':
        if (r === 'STAFF' || r === 'ADMIN') {
          return { error: 'grades_not_available_for_role' };
        }
        return this.grades.forUser(userId);
      case 'get_requests':
        return this.requests.listOwn(userId);
      case 'get_staff_requests':
        if (r !== 'STAFF' && r !== 'ADMIN') {
          return { error: 'forbidden' };
        }
        return this.requests.listStaff();
      case 'get_notifications':
        return this.notifications.forUser(userId);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  private stubChatReply(role: string): string {
    const r = role.toUpperCase();
    if (r === 'STAFF' || r === 'ADMIN') {
      return [
        'ИИ сейчас недоступен. Откройте очередь заявок и сводку дня:',
        '[[today]]',
        '{{widget:request|title=Очередь заявок|href=/staff/requests}}',
      ].join('\n');
    }
    if (r === 'TEACHER') {
      return [
        'ИИ сейчас недоступен. Откройте расписание на сегодня:',
        '[[today]]',
        '[[schedule]]',
      ].join('\n');
    }
    return [
      'ИИ сейчас недоступен — вот быстрые экраны кабинета:',
      '[[today]]',
      '[[schedule]]',
      '{{widget:task|title=Учёба и долги|href=/grades}}',
      '{{widget:request|title=Мои заявки|href=/requests}}',
    ].join('\n');
  }

  async draftRequest(userId: string, dto: DraftRequestDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    const bits = this.profileBits(profile);

    const system = [
      'Ты секретарь деканата. Пишешь ТОЛЬКО основную часть заявления (1–3 абзаца) по ГОСТ-практике вузов РФ.',
      'Начинай с «Прошу…». Без шапки, без слова ЗАЯВЛЕНИЕ, без даты и подписи, без markdown, без примечаний и советов.',
      'Деловой стиль, сгладь мат/сленг, сохрани причину и сроки если они есть.',
      'Если ФИО мужское, а в контексте беременность — формулируй как отпуск по уходу / в связи с беременностью супруги / семейные обстоятельства.',
      'Не выдумывай номер студенческого и юридические гарантии.',
    ].join(' ');

    const userPrompt = [
      `Тип заявки: ${dto.type}`,
      this.profilePromptLine(bits),
      dto.context ? `Пояснение студента: ${dto.context}` : '',
      'Выдай только абзацы сути заявления.',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await completeWithFallback({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      model: this.model,
      system,
      user: userPrompt,
      stub: () => this.stubBody(dto.type, dto.context),
      logger: (msg) => this.logger.warn(msg),
    });

    const essence =
      extractStatementBody(sanitizeDraftText(result.text)) ||
      sanitizeDraftText(result.text);
    const draft = assembleApplicationText(bits, essence);

    return {
      type: dto.type,
      draft,
      source: result.source,
      disclaimer:
        result.source === 'stub'
          ? 'Шаблон по ГОСТ: ИИ временно недоступен. Отредактируйте текст вручную.'
          : 'Черновик по ГОСТ — проверьте и скачайте Word при необходимости.',
    };
  }

  async exportDocx(userId: string, dto: ExportDocxDto): Promise<{
    filename: string;
    buffer: Buffer;
  }> {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    const bits = this.profileBits(profile);
    const body = sanitizeDraftText(dto.body);
    const buffer = await buildApplicationDocx({
      ...bits,
      requestType: dto.type,
      body,
    });
    const safeType = dto.type.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 40);
    return {
      filename: `zayavlenie_${safeType || 'dekanat'}.docx`,
      buffer,
    };
  }

  async nextActions(userId: string, dto: NextActionsDto) {
    const grades = await this.prisma.grade.findMany({
      where: { studentUserId: userId },
    });
    const debts = grades.filter((g) => g.isDebt);
    const system =
      'Ты помощник по учёбе. Дай ровно 3 конкретных следующих шага на русском. Без паники и без угроз отчисления как факта.';
    const userPrompt = [
      `Долгов: ${debts.length}`,
      debts.length
        ? `Предметы с долгами: ${debts.map((d) => d.discipline).join(', ')}`
        : 'Академических долгов нет',
      dto.focus ? `Фокус: ${dto.focus}` : '',
      'Ответ: нумерованный список из 3 пунктов.',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await completeWithFallback({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      model: this.model,
      system,
      user: userPrompt,
      stub: () => this.stubNextActions(debts.map((d) => d.discipline)),
      logger: (msg) => this.logger.warn(msg),
    });

    return {
      actions: result.text,
      source: result.source,
      disclaimer:
        result.source === 'stub'
          ? 'Шаблонные шаги: ИИ временно недоступен.'
          : 'Рекомендации ИИ, не официальная позиция вуза.',
    };
  }

  async explainNotification(dto: ExplainNotificationDto) {
    const system =
      'Объясни уведомление студенту простым языком на русском. 2–4 предложения. Без паники.';
    const userPrompt = [
      `Заголовок: ${dto.title}`,
      `Текст: ${dto.body}`,
      dto.kind ? `Тип: ${dto.kind}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await completeWithFallback({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      model: this.model,
      system,
      user: userPrompt,
      stub: () => this.stubExplain(dto.title, dto.body),
      logger: (msg) => this.logger.warn(msg),
    });

    return {
      explanation: result.text,
      source: result.source,
      disclaimer:
        result.source === 'stub'
          ? 'Краткое пояснение-шаблон: ИИ временно недоступен.'
          : 'Пояснение ИИ, уточняйте у деканата при сомнениях.',
    };
  }

  private stubBody(type: string, context?: string): string {
    const reason = context?.trim()
      ? context.trim().slice(0, 400)
      : 'по указанному вопросу в рамках учебного процесса';
    return (
      `Прошу рассмотреть обращение типа «${type}». ${reason}. ` +
      'Готов(а) предоставить дополнительные сведения и документы по запросу деканата.'
    );
  }

  private stubNextActions(debtDisciplines: string[]): string {
    if (debtDisciplines.length === 0) {
      return [
        '1. Проверьте расписание на неделю и отметьте контрольные точки.',
        '2. Закройте открытые заявки в деканате, если они ещё актуальны.',
        '3. Подготовьте вопросы к куратору/преподавателю заранее.',
      ].join('\n');
    }
    return [
      `1. Уточните у преподавателя по «${debtDisciplines[0]}» сроки пересдачи/консультации.`,
      '2. Соберите материалы и запишитесь на консультацию в ближайшие 7 дней.',
      '3. Если нужны справки/допуски — оформите заявку в кабинете до дедлайна.',
    ].join('\n');
  }

  private stubExplain(title: string, body: string): string {
    return (
      `Уведомление «${title}» означает, что изменилось что-то в вашем учебном плане или заявке. ` +
      `Кратко: ${body.slice(0, 180)}${body.length > 180 ? '…' : ''} ` +
      `Проверьте детали в кабинете и при сомнениях уточните у сотрудника деканата.`
    );
  }
}
