export type LlmCompleteResult = {
  text: string;
  source: 'zcode' | 'stub';
  error?: string;
};

export type LlmCompleteOpts = {
  apiKey?: string;
  baseUrl: string;
  model: string;
  system: string;
  user: string;
  stub: () => string;
  fetchImpl?: typeof fetch;
  logger?: (msg: string) => void;
};

/**
 * OpenAI-compatible chat completion with honest source reporting.
 * If the key is missing or the call fails, returns stub text with source: 'stub'.
 */
export async function completeWithFallback(
  opts: LlmCompleteOpts,
): Promise<LlmCompleteResult> {
  const log = opts.logger ?? (() => undefined);
  const doFetch = opts.fetchImpl ?? fetch;

  if (!opts.apiKey) {
    return { text: opts.stub(), source: 'stub', error: 'no_api_key' };
  }

  try {
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
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user },
          ],
          temperature: 0.4,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const error = `http_${res.status}:${body.slice(0, 200)}`;
      log(`[ai] LLM failed: ${error}`);
      return { text: opts.stub(), source: 'stub', error };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      log('[ai] LLM empty content');
      return { text: opts.stub(), source: 'stub', error: 'empty_content' };
    }
    return { text: content, source: 'zcode' };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log(`[ai] LLM exception: ${error}`);
    return { text: opts.stub(), source: 'stub', error };
  }
}
