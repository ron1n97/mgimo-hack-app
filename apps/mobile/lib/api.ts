import Constants from 'expo-constants';
import type { AuthResponse, TodayResponse } from '@dekanat/shared';

function resolveApiUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    extra?.apiUrl ??
    'http://localhost:3001'
  );
}

export const API_URL = resolveApiUrl();

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as AuthResponse;
}

export async function fetchToday(token: string): Promise<TodayResponse> {
  const res = await fetch(`${API_URL}/today/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`today failed (${res.status})`);
  }
  return (await res.json()) as TodayResponse;
}
