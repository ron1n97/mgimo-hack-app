/** In-memory demo sessions: telegram user id → JWT. Not for production scale. */
const tokens = new Map<number, string>();

export function setUserToken(telegramUserId: number, token: string): void {
  tokens.set(telegramUserId, token);
}

export function getUserToken(telegramUserId: number): string | undefined {
  return tokens.get(telegramUserId);
}

export function clearUserToken(telegramUserId: number): void {
  tokens.delete(telegramUserId);
}
