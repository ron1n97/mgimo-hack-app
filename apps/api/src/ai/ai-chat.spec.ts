import { completeChatTurn } from './ai-chat';

describe('completeChatTurn', () => {
  it('returns stub with widgets when no api key', async () => {
    const result = await completeChatTurn({
      apiKey: undefined,
      baseUrl: 'https://example.test/v1',
      model: 'x',
      role: 'STUDENT',
      userMessage: 'Что сегодня?',
      runTool: async () => ({}),
      stubReply: () =>
        'ИИ недоступен\n[[today]]\n{{widget:task|title=Учёба|href=/grades}}',
    });

    expect(result.source).toBe('stub');
    expect(result.error).toBe('no_api_key');
    expect(result.widgets.map((w) => w.kind)).toEqual(['today', 'task']);
    expect(result.disclaimer).toMatch(/недоступен/i);
  });

  it('runs one tool round then returns zcode text', async () => {
    let calls = 0;
    const fetchImpl = jest.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'c1',
                      type: 'function',
                      function: { name: 'get_today', arguments: '{}' },
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: 'assistant',
                content:
                  'Сегодня: {{widget:lesson|id=1|title=Право|time=10:00}}',
              },
            },
          ],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const runTool = jest.fn(async () => ({ lessons: [{ id: '1' }] }));

    const result = await completeChatTurn({
      apiKey: 'secret',
      baseUrl: 'https://example.test/v1',
      model: 'glm-5.3',
      role: 'STUDENT',
      userMessage: 'пары',
      runTool,
      stubReply: () => 'STUB',
      fetchImpl,
    });

    expect(runTool).toHaveBeenCalledWith('get_today', {});
    expect(result.source).toBe('zcode');
    expect(result.steps.map((s) => s.tool)).toEqual([
      'model',
      'get_today',
      'model',
    ]);
    expect(result.steps.every((s) => s.status === 'done')).toBe(true);
    expect(result.widgets[0]).toMatchObject({
      kind: 'lesson',
      id: '1',
      title: 'Право',
    });
  });

  it('emits live step events while tools run', async () => {
    let calls = 0;
    const events: Array<{
      type: string;
      step?: { status: string; tool: string; label: string };
    }> = [];
    const fetchImpl = jest.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'c1',
                      type: 'function',
                      function: { name: 'get_grades', arguments: '{}' },
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          choices: [
            { message: { role: 'assistant', content: 'Долгов нет.' } },
          ],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    await completeChatTurn({
      apiKey: 'secret',
      baseUrl: 'https://example.test/v1',
      model: 'glm-5.3',
      role: 'STUDENT',
      userMessage: 'долги',
      runTool: async () => ({ debts: [] }),
      stubReply: () => 'STUB',
      fetchImpl,
      onEvent: (e) => events.push(e as never),
    });

    const stepEvents = events.filter((e) => e.type === 'step');
    expect(stepEvents.map((e) => `${e.step?.tool}:${e.step?.status}`)).toEqual([
      'model:running',
      'model:done',
      'get_grades:running',
      'get_grades:done',
      'model:running',
      'model:done',
    ]);
    expect(
      stepEvents.find((e) => e.step?.tool === 'get_grades')?.step?.label,
    ).toBe('Проверяю оценки и долги');
    expect(events.some((e) => e.type === 'assistant')).toBe(true);
    expect(events.some((e) => e.type === 'done')).toBe(true);
  });
});
