/**
 * RUZ sometimes returns `{ error, message }` with HTTP 200.
 * Never treat that as an empty list.
 */
export function parseRuzArrayResponse(
  data: unknown,
  kind: 'search' | 'schedule',
  context: string,
): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>;
    const message =
      row.message != null
        ? String(row.message)
        : row.error != null
          ? String(row.error)
          : JSON.stringify(data);
    throw new Error(`RUZ ${kind} error for ${context}: ${message}`);
  }
  throw new Error(`RUZ ${kind} unexpected payload for ${context}`);
}
