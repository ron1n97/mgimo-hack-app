export type ChatToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const TOOL_GET_TODAY: ChatToolDefinition = {
  type: 'function',
  function: {
    name: 'get_today',
    description: 'Сводка на сегодня: пары, открытые заявки, уведомления, долги.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
};

const TOOL_GET_SCHEDULE: ChatToolDefinition = {
  type: 'function',
  function: {
    name: 'get_schedule',
    description: 'Расписание на диапазон дат (YYYY-MM-DD).',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string' },
        to: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
};

const TOOL_GET_GRADES: ChatToolDefinition = {
  type: 'function',
  function: {
    name: 'get_grades',
    description: 'Оценки и академические долги (задачи по учёбе).',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
};

const TOOL_GET_REQUESTS: ChatToolDefinition = {
  type: 'function',
  function: {
    name: 'get_requests',
    description: 'Мои заявки в деканат.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
};

const TOOL_GET_STAFF_REQUESTS: ChatToolDefinition = {
  type: 'function',
  function: {
    name: 'get_staff_requests',
    description: 'Заявки сотрудников деканата МЭО.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
};

const TOOL_GET_NOTIFICATIONS: ChatToolDefinition = {
  type: 'function',
  function: {
    name: 'get_notifications',
    description: 'Лента уведомлений.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
};

const TOOL_GET_DIGEST: ChatToolDefinition = {
  type: 'function',
  function: {
    name: 'get_digest',
    description:
      'Дайджест клубов: события на сегодня и на текущую неделю (MSK), с ссылками.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
};

const TOOL_GET_STAFF_OVERVIEW: ChatToolDefinition = {
  type: 'function',
  function: {
    name: 'get_staff_overview',
    description:
      'Сводка деканата: число открытых заявок, непрочитанных уведомлений, анонсов.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
};

export function toolsForRole(role: string): ChatToolDefinition[] {
  const r = role.toUpperCase();
  if (r === 'STAFF' || r === 'ADMIN') {
    return [
      TOOL_GET_TODAY,
      TOOL_GET_SCHEDULE,
      TOOL_GET_STAFF_REQUESTS,
      TOOL_GET_STAFF_OVERVIEW,
      TOOL_GET_DIGEST,
      TOOL_GET_NOTIFICATIONS,
    ];
  }
  if (r === 'TEACHER') {
    return [
      TOOL_GET_TODAY,
      TOOL_GET_SCHEDULE,
      TOOL_GET_DIGEST,
      TOOL_GET_NOTIFICATIONS,
    ];
  }
  return [
    TOOL_GET_TODAY,
    TOOL_GET_SCHEDULE,
    TOOL_GET_GRADES,
    TOOL_GET_REQUESTS,
    TOOL_GET_DIGEST,
    TOOL_GET_NOTIFICATIONS,
  ];
}

export function widgetDslInstructions(): string {
  return [
    'Когда упоминаешь конкретные сущности кабинета, вставляй виджет-теги (не markdown-ссылки):',
    '{{widget:lesson|id=ID|title=Название|time=09:00-10:30|subtitle=Преподаватель, ауд.}}',
    '{{widget:request|id=ID|title=Тема|status=SUBMITTED}}',
    '{{widget:grade|id=ID|title=Предмет}}',
    '{{widget:task|id=ID|title=Что сделать}}',
    '{{widget:event|id=ID|title=Событие}}',
    '{{widget:notification|id=ID|title=Уведомление}}',
    'Шорткаты: [[today]] [[schedule]] [[lesson:id=...|title=...]] [[request:id=...]]',
    'Преподавателя и аудиторию клади в subtitle виджета, не отдельной строкой в скобках.',
    'Не ставь маркеры списка «-» перед виджетами — карточка виджета уже элемент списка.',
    'Заголовки секций можно выделять **жирным**.',
    'Сначала вызови нужные tools, потом ответь кратко по-русски и вставь виджеты по фактам tools.',
    'Не выдумывай id, оценки, статусы. Без угроз отчисления как факта.',
  ].join(' ');
}

export function systemPromptForRole(role: string, profileHint?: string): string {
  const r = role.toUpperCase();
  const base = [
    'Ты in-product ассистент «Деканат+» (конкурсный концепт, не офиц. сервис вуза).',
    'Отвечай кратко по-русски. Факты только из tools.',
    widgetDslInstructions(),
  ];

  if (r === 'STAFF' || r === 'ADMIN') {
    base.push(
      'Роль: сотрудник деканата. Фокус — очередь заявок, статусы, объявления, дайджест клубов и что сделать сегодня.',
      'Для афиши/клубов вызывай get_digest. Для нагрузки кабинета — get_staff_overview и get_staff_requests.',
      'Предлагай конкретные следующие шаги в кабинете (/staff/requests, /staff/clubs, /staff/students).',
    );
  } else if (r === 'TEACHER') {
    base.push(
      'Роль: преподаватель. Фокус — расписание/пары, задания и уведомления. Заявки студентов не трогай.',
      'Можешь кратко рассказать дайджест клубов через get_digest.',
    );
  } else {
    base.push(
      'Роль: студент. Помогай с расписанием, долгами/задачами, заявками, дайджестом клубов и «что дальше».',
      'На вопросы про мероприятия/клубы вызывай get_digest.',
    );
  }

  if (profileHint) base.push(`Контекст профиля: ${profileHint}`);
  return base.join(' ');
}
