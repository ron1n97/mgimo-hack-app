import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'dekanat_access_token';

const memory = new Map<string, string>();

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    memory.set(key, value);
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return memory.get(key) ?? globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    memory.delete(key);
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveToken(token: string): Promise<void> {
  await setItem(KEY, token);
}

export async function loadToken(): Promise<string | null> {
  return getItem(KEY);
}

export async function clearToken(): Promise<void> {
  await deleteItem(KEY);
}
