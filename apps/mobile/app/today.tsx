import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function Today() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const token = (globalThis as any).__DEKANAT_TOKEN;
      const res = await fetch(`${API}/today/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Не удалось загрузить Today');
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView
      style={styles.wrap}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <Text style={styles.h1}>Сегодня</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {data?.lessons?.map((l: any, i: number) => (
        <View key={i} style={styles.card}>
          <Text style={styles.time}>
            {l.begin}–{l.end}
          </Text>
          <Text style={styles.title}>{l.discipline}</Text>
          <Text style={styles.meta}>
            {l.auditorium} · {l.lecturer}
          </Text>
        </View>
      ))}
      {!data && !error ? <Text style={styles.meta}>Загрузка…</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: '#0B1C2C' },
  h1: { fontSize: 28, color: '#F3EADC', marginBottom: 16, fontWeight: '700' },
  card: {
    backgroundColor: '#163047',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  time: { color: '#C45C26', fontWeight: '600' },
  title: { color: '#F3EADC', fontSize: 16, marginTop: 4 },
  meta: { color: '#8AA0B4', marginTop: 4 },
  err: { color: '#E07A3A', marginBottom: 12 },
});
