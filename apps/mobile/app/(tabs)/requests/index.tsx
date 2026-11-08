import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { RequestTicketDto } from '@dekanat/shared';
import { Card, EmptyBlock, Screen } from '@/components/Screen';
import { ApiError, fetchRequests } from '@/lib/api';
import { clearToken, loadToken } from '@/lib/auth-store';
import { TICKET_STATUS_RU } from '@/lib/labels';
import { colors } from '@/lib/theme';

export default function RequestsScreen() {
  const [items, setItems] = useState<RequestTicketDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const token = await loadToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      setItems(await fetchRequests(token));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearToken();
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen
      title="Заявки"
      subtitle="Сервисные обращения в деканат"
      loading={loading}
      error={error}
      onRetry={() => void load()}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      headerRight={
        <Pressable
          style={styles.newBtn}
          onPress={() => router.push('/requests/new')}
        >
          <Text style={styles.newBtnText}>+ Новая</Text>
        </Pressable>
      }
    >
      {!loading && !error && items.length === 0 ? (
        <EmptyBlock
          title="Заявок пока нет"
          description="Создайте простую заявку — статус появится здесь."
        />
      ) : null}

      {items.map((item) => (
        <Card key={item.id}>
          <View style={styles.row}>
            <Text style={styles.type}>{item.type}</Text>
            <Text style={styles.status}>
              {TICKET_STATUS_RU[item.status] ?? item.status}
            </Text>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={3}>
            {item.body}
          </Text>
          <Text style={styles.meta}>
            {new Date(item.createdAt).toLocaleString('ru-RU')}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    backgroundColor: colors.copper,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newBtnText: { color: colors.cream, fontWeight: '700', fontSize: 13 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  type: { color: colors.inkMuted, fontSize: 12, flex: 1 },
  status: { color: colors.copper, fontWeight: '700', fontSize: 12 },
  title: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  body: { color: colors.inkMuted, marginTop: 6, fontSize: 14, lineHeight: 20 },
  meta: { color: colors.inkMuted, marginTop: 8, fontSize: 12 },
});
