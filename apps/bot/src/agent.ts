import {
  CABINET_TOOL_DEFINITIONS,
  CabinetClient,
  executeCabinetTool,
  needsApproval,
  toolRisk,
  type ToolArgs,
} from '@dekanat/cabinet-tools';

export type ChatMessage = {
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

export type AgentHooks = {
  onStatus?: (text: string) => Promise<void> | void;
  /** Gate mutations. Return false to deny. */
  requestApproval?: (
    toolName: string,
    args: ToolArgs,
  ) => Promise<boolean>;
};

function buildSystem(ctx: {
  label?: string;
  profileHint?: string;
}): string {
  return [
    'Ты реактивный агент «Деканат+» (конкурсный концепт, не офиц. сервис вуза).',
    'Стиль: кратко, по-русски, без воды. Сначала факты из tools, потом вывод.',
    'Паттерн: подумай какие tools нужны → вызови → ответь. Можно несколько tools за шаг.',
    'Никогда не выдумывай пары, оценки, статусы — только результат tools.',
    'Мутации (create_request, update_request_status) система подтвердит у пользователя отдельно — не обещай, что уже сделано, пока tool не вернул успех.',
    'Не юрист и не угрожай отчислением как фактом.',
    'Если данных мало — спроси одно уточнение, не эссе.',
    ctx.label ? `Пользователь сессии: ${ctx.label}.` : '',
    ctx.profileHint ? `Контекст профиля: ${ctx.profileHint}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function truncateToolResult(value: unknown, max = 6000): string {
  const raw = JSON.stringify(value);
  if (raw.length <= max) return raw;
  return raw.slice(0, max) + '…[truncated]';
}

function parseArgs(raw: string): ToolArgs {
  try {
    return JSON.parse(raw || '{}') as ToolArgs;
  } catch {
    return {};
  }
}

/**
 * Bounded tool-calling agent (ReAct-ish): model ↔ tools ↔ approve writes.
 * Same tool catalog as MCP (`@dekanat/cabinet-tools`).
 */
export async function runCabinetAgent(opts: {
  llm: LlmConfig;
  client: CabinetClient;
  userText: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  label?: string;
  profileHint?: string;
  maxRounds?: number;
  hooks?: AgentHooks;
}): Promise<string> {
  const maxRounds = opts.maxRounds ?? 8;
  const hooks = opts.hooks ?? {};
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildSystem({
        label: opts.label,
        profileHint: opts.profileHint,
      }),
    },
    ...(opts.history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: opts.userText },
  ];

  for (let round = 0; round < maxRounds; round++) {
    await hooks.onStatus?.(
      round === 0 ? 'Думаю…' : `Шаг ${round + 1}: tools…`,
    );

    const res = await fetch(
      `${opts.llm.baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.llm.apiKey}`,
        },
        body: JSON.stringify({
          model: opts.llm.model,
          messages,
          tools: CABINET_TOOL_DEFINITIONS,
          tool_choice: 'auto',
          temperature: 0.25,
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM ${res.status}: ${errText.slice(0, 400)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: ChatMessage }>;
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
      const name = call.function.name;
      const args = parseArgs(call.function.arguments);
      const risk = toolRisk(name);

      await hooks.onStatus?.(
        risk === 'read'
          ? `Читаю: ${name}…`
          : `Действие: ${name} (нужно подтверждение)…`,
      );

      if (needsApproval(name)) {
        const ok = hooks.requestApproval
          ? await hooks.requestApproval(name, args)
          : false;
        if (!ok) {
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            name,
            content: JSON.stringify({
              error: 'user_denied',
              message: 'Пользователь отклонил или не подтвердил действие.',
            }),
          });
          continue;
        }
      }

      let result: unknown;
      try {
        result = await executeCabinetTool(opts.client, name, args);
      } catch (err) {
        result = {
          error: err instanceof Error ? err.message : String(err),
        };
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name,
        content: truncateToolResult(result),
      });
    }
  }

  return 'Слишком длинная цепочка tools — уточните запрос.';
}
