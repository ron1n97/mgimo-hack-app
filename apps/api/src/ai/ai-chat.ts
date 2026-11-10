import { systemPromptForRole, toolsForRole } from './chat-tools';
import { parseAssistantMarkup, type AssistantPart, type AssistantWidget } from './widget-markup';

export type ChatLlmMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

export type ChatTurnResult = {
  content: string;
  parts: AssistantPart[];
  widgets: AssistantWidget[];
  source: 'zcode' | 'stub';
  disclaimer: string;
  error?: string;
};

export type ChatCompleteOpts = {
  apiKey?: string;
  baseUrl: string;
  model: string;
  role: string;
  profileHint?: string;
  userMessage: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  runTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  stubReply: () => string;
  fetchImpl?: typeof fetch;
  logger?: (msg: string) => void;
  maxRounds?: number;
};

function truncate(value: unknown, max = 6000): string {
  const raw = JSON.stringify(value);
  if (raw.length <= max) return raw;
  return raw.slice(0, max) + '…[truncated]';
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Bounded read-only tool loop for in-app chat + honest stub fallback.
 */
export async function completeChatTurn(
  opts: ChatCompleteOpts,
): Promise<ChatTurnResult> {
  const log = opts.logger ?? (() => undefined);
  const doFetch = opts.fetchImpl ?? fetch;
  const maxRounds = opts.maxRounds ?? 4;
  const tools = toolsForRole(opts.role);

  const finish = (
    content: string,
    source: 'zcode' | 'stub',
    error?: string,
  ): ChatTurnResult => {
    const { parts, widgets } = parseAssistantMarkup(content, opts.role);
    return {
      content,
      parts,
      widgets,
      source,
      disclaimer:
        source === 'stub'
          ? 'Шаблонный ответ: ИИ временно недоступен. Откройте экраны кабинета вручную.'
          : 'Ответ ИИ по данным кабинета — не официальная позиция вуза.',
      error,
    };
  };

  if (!opts.apiKey) {
    return finish(opts.stubReply(), 'stub', 'no_api_key');
  }

  const messages: ChatLlmMessage[] = [
    {
      role: 'system',
      content: systemPromptForRole(opts.role, opts.profileHint),
    },
    ...(opts.history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: opts.userMessage },
  ];

  try {
    for (let round = 0; round < maxRounds; round++) {
      const res = await doFetch(
        `${opts.baseUrl.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${opts.apiKey}`,
          },
          body: JSON.stringify({
            model: opts.model,
            messages,
            tools,
            tool_choice: 'auto',
            temperature: 0.3,
          }),
        },
      );

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const error = `http_${res.status}:${body.slice(0, 200)}`;
        log(`[ai-chat] LLM failed: ${error}`);
        return finish(opts.stubReply(), 'stub', error);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: ChatLlmMessage }>;
      };
      const msg = data.choices?.[0]?.message;
      if (!msg) {
        return finish(opts.stubReply(), 'stub', 'empty_response');
      }

      messages.push({
        role: 'assistant',
        content: msg.content ?? null,
        tool_calls: msg.tool_calls,
      });

      const calls = msg.tool_calls ?? [];
      if (calls.length === 0) {
        const text = (msg.content ?? '').trim();
        if (!text) {
          return finish(opts.stubReply(), 'stub', 'empty_content');
        }
        return finish(text, 'zcode');
      }

      for (const call of calls) {
        const name = call.function.name;
        const args = parseArgs(call.function.arguments);
        let result: unknown;
        try {
          result = await opts.runTool(name, args);
        } catch (err) {
          result = {
            error: err instanceof Error ? err.message : String(err),
          };
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name,
          content: truncate(result),
        });
      }
    }

    return finish(
      'Слишком длинная цепочка tools — уточните вопрос.',
      'zcode',
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log(`[ai-chat] exception: ${error}`);
    return finish(opts.stubReply(), 'stub', error);
  }
}
