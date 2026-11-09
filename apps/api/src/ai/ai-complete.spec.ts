import { completeWithFallback } from './ai-complete';

describe('completeWithFallback', () => {
  it('returns stub with source stub when no api key', async () => {
    const result = await completeWithFallback({
      apiKey: undefined,
      baseUrl: 'https://example.test/v1',
      model: 'x',
      system: 's',
      user: 'u',
      stub: () => 'STUB_TEXT',
    });
    expect(result).toEqual({
      text: 'STUB_TEXT',
      source: 'stub',
      error: 'no_api_key',
    });
  });

  it('returns stub with source stub when HTTP fails even if key present', async () => {
    const fetchImpl = jest.fn(async () =>
      new Response('rate limited', { status: 429 }),
    ) as unknown as typeof fetch;

    const result = await completeWithFallback({
      apiKey: 'secret',
      baseUrl: 'https://example.test/v1',
      model: 'x',
      system: 's',
      user: 'u',
      stub: () => 'STUB_TEXT',
      fetchImpl,
    });

    expect(result.source).toBe('stub');
    expect(result.text).toBe('STUB_TEXT');
    expect(result.error).toMatch(/http_429/);
  });

  it('returns zcode source when model responds', async () => {
    const fetchImpl = jest.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '  LIVE DRAFT  ' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as unknown as typeof fetch;

    const result = await completeWithFallback({
      apiKey: 'secret',
      baseUrl: 'https://example.test/v1',
      model: 'glm-5.3',
      system: 's',
      user: 'u',
      stub: () => 'STUB_TEXT',
      fetchImpl,
    });

    expect(result).toEqual({ text: 'LIVE DRAFT', source: 'zcode' });
  });
});
