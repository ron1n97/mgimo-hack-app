import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function Login() {
  const [email, setEmail] = useState('anna.risk@demo.local');
  const [password, setPassword] = useState('Demo123!');
  const [error, setError] = useState('');

  async function onLogin() {
    setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка входа');
      // Simple global for demo shell — replace with secure store later
      (globalThis as any).__DEKANAT_TOKEN = data.accessToken;
      router.push('/today');
    } catch (e: any) {
      setError(e.message || 'Сеть недоступна');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.brand}>Деканат+</Text>
      <Text style={styles.disc}>
        Концепт конкурса MGIMO×AI, не официальный сервис вуза.
      </Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        placeholder="email"
        placeholderTextColor="#8AA0B4"
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="пароль"
        placeholderTextColor="#8AA0B4"
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Pressable style={styles.btn} onPress={onLogin}>
        <Text style={styles.btnText}>Войти</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 12 },
  brand: { fontSize: 36, color: '#F3EADC', fontWeight: '700' },
  disc: { color: '#8AA0B4', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(243,234,220,0.2)',
    borderRadius: 12,
    padding: 14,
    color: '#F3EADC',
  },
  btn: {
    backgroundColor: '#C45C26',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  err: { color: '#E07A3A' },
});
