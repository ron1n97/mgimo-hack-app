import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  DraftRequestDto,
  ExplainNotificationDto,
  NextActionsDto,
} from './dto/ai.dto';

@Injectable()
export class AiService {
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
      'https://openrouter.ai/api/v1'
    );
  }

  private get model(): string {
    return this.config.get<string>('ZCODE_MODEL') ?? 'openai/gpt-4o-mini';
  }

  async draftRequest(userId: string, dto: DraftRequestDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    const system =
      'Ты помощник цифрового деканата. Пишешь черновик заявки/справки на русском. Без юридических гарантий. Не выдумывай номер студенческого.';
    const userPrompt = [
      `Тип заявки: ${dto.type}`,
      profile
        ? `Студент: ${profile.fullName}, ${profile.faculty}, ${profile.program}, курс ${profile.course}, группа ${profile.groupLabel}`
        : 'Профиль студента не заполнен',
      dto.context ? `Контекст: ${dto.context}` : '',
      'Сформируй короткий черновик текста заявки (3–6 предложений).',
    ]
      .filter(Boolean)
      .join('\n');

    const text = await this.complete(system, userPrompt, () =>
      this.stubDraft(dto.type, profile?.fullName),
    );

    return {
      type: dto.type,
      draft: text,
      source: this.apiKey ? 'zcode' : 'stub',
      disclaimer: 'Черновик ИИ — проверьте перед отправкой. Не юр. консультация.',
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

    const text = await this.complete(system, userPrompt, () =>
      this.stubNextActions(debts.map((d) => d.discipline)),
    );

    return {
      actions: text,
      source: this.apiKey ? 'zcode' : 'stub',
      disclaimer: 'Рекомендации ИИ, не официальная позиция вуза.',
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

    const text = await this.complete(system, userPrompt, () =>
      this.stubExplain(dto.title, dto.body),
    );

    return {
      explanation: text,
      source: this.apiKey ? 'zcode' : 'stub',
      disclaimer: 'Пояснение ИИ, уточняйте у деканата при сомнениях.',
    };
  }

  private async complete(
    system: string,
    user: string,
    stub: () => string,
  ): Promise<string> {
    if (!this.apiKey) {
      return stub();
    }
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.4,
        }),
      });
      if (!res.ok) {
        return stub();
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      return content || stub();
    } catch {
      return stub();
    }
  }

  private stubDraft(type: string, fullName?: string): string {
    const name = fullName ?? 'Студент';
    return (
      `Прошу рассмотреть обращение типа «${type}».\n\n` +
      `Я, ${name}, прошу подготовить/оказать содействие по указанному вопросу в рамках учебного процесса. ` +
      `Готов(а) предоставить дополнительные сведения по запросу деканата.\n\n` +
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
