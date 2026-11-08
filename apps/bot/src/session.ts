type Session = {
  accessToken: string;
  label?: string;
};

const byTelegramId = new Map<number, Session>();

export function getSession(telegramId: number): Session | undefined {
  return byTelegramId.get(telegramId);
}

export function setSession(
  telegramId: number,
  accessToken: string,
  label?: string,
): void {
  byTelegramId.set(telegramId, { accessToken, label });
}

export function clearSession(telegramId: number): void {
  byTelegramId.delete(telegramId);
}

/** @deprecated use getSession */
export function getUserToken(telegramId: number): string | undefined {
  return byTelegramId.get(telegramId)?.accessToken;
}

/** @deprecated use setSession */
export function setUserToken(telegramId: number, token: string): void {
  setSession(telegramId, token);
}

/** @deprecated use clearSession */
export function clearUserToken(telegramId: number): void {
  clearSession(telegramId);
}
