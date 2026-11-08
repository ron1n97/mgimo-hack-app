import {
  CABINET_TOOL_DEFINITIONS,
  CabinetClient,
  executeCabinetTool,
} from '@dekanat/cabinet-tools';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

type ToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

const SYSTEM = [
  'Ты ИИ-помощник «Деканат+» (конкурсный концепт, не офиц. сервис вуза).',
  'Отвечай по-русски кратко и по делу.',
  'Действуй только через tools по данным кабинета пользователя.',
  'Не выдумывай оценки, пары, статусы заявок.',
  'Создание заявки — только если студент явно просит; подтверди суть в ответе.',
  'Не давай юридических гарантий и не угрожай отчислением как фактом.',
].join(' ');

export async function runCabinetAgent(opts: {
  llm: LlmConfig;
  client: CabinetClient;
  userText: string;
  history?: ChatMessage[];
  maxRounds?: number;
}): Promise<string> {
  const { llm, client, userText } = opts;
  const maxRounds = opts.maxRounds ?? 6;
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    ...(opts.history ?? []),
    { role: 'user', content: userText },
  ];

  for (let round = 0; round < maxRounds; round++) {
    const res = await fetch(
      `${llm.baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${llm.apiKey}`,
        },
        body: JSON.stringify({
          model: llm.model,
          messages,
          tools: CABINET_TOOL_DEFINITIONS,
          tool_choice: 'auto',
          temperature: 0.3,
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM ${res.status}: ${errText.slice(0, 400)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: ChatMessage;
        finish_reason?: string;
      }>;
    };
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('LLM empty response');

    messages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    });

    const calls = msg.tool_calls ?? [];
    if (calls.length === 0) {
      return (msg.content ?? '').trim() || 'Готово.';
    }

    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || '{}') as Record<
          string,
          unknown
        >;
      } catch {
        args = {};
      }
      let result: unknown;
      try {
        result = await executeCabinetTool(client, call.function.name, args);
      } catch (err) {
        result = {
          error: err instanceof Error ? err.message : String(err),
        };
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result),
      });
    }
  }

  return 'Слишком много шагов tools — уточните запрос короче.';
}
