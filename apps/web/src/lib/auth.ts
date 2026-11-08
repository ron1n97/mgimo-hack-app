import type { User } from "./types";

const TOKEN_KEY = "dekanat_access_token";
const USER_KEY = "dekanat_user";

/**
 * Auth storage: JWT in localStorage + Authorization: Bearer on API calls.
 * Chosen for contest speed (no cookie BFF). Documented in apps/web/README.md
 * and docs/adr/0005-web-jwt-localstorage.md.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
