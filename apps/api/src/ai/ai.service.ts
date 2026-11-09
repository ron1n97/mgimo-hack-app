import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { completeWithFallback } from './ai-complete';
import {
  DraftRequestDto,
  ExplainNotificationDto,
  NextActionsDto,
} from './dto/ai.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
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

  async draftRequest(userId: string, dto: DraftRequestDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    const system = [
      'Ты помощник цифрового деканата. Пишешь черновик официальной заявки на русском.',
      'Используй факты из контекста (причина, сроки), но сгладь мат и сленг до делового стиля.',
      'Не выдумывай номер студенческого и не давай юридических гарантий.',
      'Верни только текст заявления, без markdown-заголовков про «что заполнить», если можно обойтись 4–8 предложениями.',
    ].join(' ');
    const userPrompt = [
      `Тип заявки: ${dto.type}`,
      profile
        ? `Студент: ${profile.fullName}, ${profile.faculty}, ${profile.program}, курс ${profile.course}, группа ${profile.groupLabel}`
        : 'Профиль студента не заполнен',
      dto.context ? `Контекст от студента: ${dto.context}` : '',
      'Сформируй короткий черновик текста заявки.',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await completeWithFallback({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      model: this.model,
      system,
      user: userPrompt,
      stub: () => this.stubDraft(dto.type, profile?.fullName, dto.context),
      logger: (msg) => this.logger.warn(msg),
    });

    return {
      type: dto.type,
      draft: result.text,
      source: result.source,
      disclaimer:
        result.source === 'stub'
          ? 'Показан шаблон: ИИ временно недоступен. Отредактируйте текст вручную.'
          : 'Черновик ИИ — проверьте перед отправкой. Не юр. консультация.',
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

  private stubDraft(type: string, fullName?: string, context?: string): string {
    const name = fullName ?? 'Студент';
    const reason = context?.trim()
      ? `Суть обращения: ${context.trim().slice(0, 280)}.`
      : 'Прошу оказать содействие по указанному вопросу в рамках учебного процесса.';
    return (
      `Прошу рассмотреть обращение типа «${type}».\n\n` +
      `Я, ${name}, обращаюсь по следующей причине. ${reason} ` +
      `Готов(а) предоставить дополнительные сведения и документы по запросу деканата.\n\n` +
      `С уважением,\n${name}`
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
