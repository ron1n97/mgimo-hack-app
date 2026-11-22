export type EmbedOpts = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  dimensions?: number;
  fetchImpl?: typeof fetch;
};

/**
 * OpenAI-compatible embeddings (Z.ai embedding-3 / OpenRouter).
 * Coding-plan base URL is rewritten to paas/v4 which exposes /embeddings.
 */
export async function embedTexts(
  texts: string[],
  opts: EmbedOpts = {},
): Promise<number[][]> {
  const apiKey = opts.apiKey?.trim() || process.env.ZCODE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('no_api_key');
  }
  let base = (
    opts.baseUrl ||
    process.env.ZCODE_BASE_URL ||
    'https://api.z.ai/api/paas/v4'
  ).replace(/\/$/, '');
  if (base.includes('coding/paas')) {
    base = 'https://api.z.ai/api/paas/v4';
  }
  const model =
    opts.model ||
    process.env.ZCODE_EMBED_MODEL ||
    'embedding-3';
  const dimensions =
    opts.dimensions ??
    (Number(process.env.ZCODE_EMBED_DIMS) || 256);
  const doFetch = opts.fetchImpl ?? fetch;

  const body: Record<string, unknown> = { model, input: texts };
  if (dimensions) body.dimensions = dimensions;

  let res = await doFetch(`${base}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok && body.dimensions) {
    delete body.dimensions;
    res = await doFetch(`${base}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`embed_http_${res.status}:${t.slice(0, 180)}`);
  }
  const data = (await res.json()) as {
    data?: Array<{ index: number; embedding: number[] }>;
  };
  const rows = [...(data.data ?? [])].sort((a, b) => a.index - b.index);
  if (rows.length !== texts.length) {
    throw new Error('embed_count_mismatch');
  }
  return rows.map((r) => r.embedding);
}

export async function embedText(
  text: string,
  opts: EmbedOpts = {},
): Promise<number[]> {
  const [v] = await embedTexts([text], opts);
  return v;
}
