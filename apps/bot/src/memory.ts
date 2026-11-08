export type MemoryMessage = {
  role: 'user' | 'assistant';
  content: string;
  at: number;
};

const MAX_TURNS = 12; // user+assistant pairs kept ≈ 6
const store = new Map<number, MemoryMessage[]>();

export function getHistory(telegramId: number): MemoryMessage[] {
  return store.get(telegramId) ?? [];
}

export function appendTurn(
  telegramId: number,
  user: string,
  assistant: string,
): void {
  const list = store.get(telegramId) ?? [];
  list.push({ role: 'user', content: user, at: Date.now() });
  list.push({ role: 'assistant', content: assistant, at: Date.now() });
  while (list.length > MAX_TURNS) list.shift();
  store.set(telegramId, list);
}

export function clearHistory(telegramId: number): void {
  store.delete(telegramId);
}

/** Compact history for the model (no tool frames). */
export function historyForModel(
  telegramId: number,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return getHistory(telegramId).map(({ role, content }) => ({ role, content }));
}
