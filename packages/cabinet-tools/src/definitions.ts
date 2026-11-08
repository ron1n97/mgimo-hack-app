/** OpenAI-compatible tool definitions for Деканат+ cabinet (bot + MCP). */

export type ToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export const CABINET_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_profile',
      description: 'Профиль текущего пользователя (ФИО, роль, группа, телефон).',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_today',
      description: 'Сводка на сегодня: пары, открытые заявки, непрочитанные уведомления, долги.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_schedule',
      description: 'Расписание на диапазон дат (YYYY-MM-DD). По умолчанию текущая неделя.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Дата от (YYYY-MM-DD)' },
          to: { type: 'string', description: 'Дата до (YYYY-MM-DD)' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_grades',
      description: 'Оценки и академические долги студента.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_requests',
      description: 'Список заявок текущего пользователя (или очередь staff).',
      parameters: {
        type: 'object',
        properties: {
          staff: {
            type: 'boolean',
            description: 'true = очередь сотрудника (только STAFF/ADMIN)',
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_request',
      description: 'Создать заявку в деканат от имени студента.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Тип заявки' },
          title: { type: 'string', description: 'Тема' },
          body: { type: 'string', description: 'Текст заявки' },
        },
        required: ['type', 'title', 'body'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_request_ai',
      description: 'Черновик текста заявки через ИИ (AI1). Не отправляет заявку.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          context: { type: 'string', description: 'Контекст / заметки' },
        },
        required: ['type'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'next_actions_ai',
      description: '3 следующих шага по учёбе (AI2).',
      parameters: {
        type: 'object',
        properties: {
          focus: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'explain_notification_ai',
      description: 'Простое объяснение уведомления (AI3).',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          kind: { type: 'string' },
        },
        required: ['title', 'body'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_notifications',
      description: 'Лента уведомлений пользователя.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_request_status',
      description: 'Сменить статус заявки (только сотрудник). SUBMITTED|IN_PROGRESS|DONE|REJECTED.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: {
            type: 'string',
            enum: ['SUBMITTED', 'IN_PROGRESS', 'DONE', 'REJECTED'],
          },
          note: { type: 'string' },
        },
        required: ['id', 'status'],
        additionalProperties: false,
      },
    },
  },
];

export const CABINET_TOOL_NAMES = CABINET_TOOL_DEFINITIONS.map(
  (t) => t.function.name,
);
