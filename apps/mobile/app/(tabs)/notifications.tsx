import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { NotificationDto } from '@dekanat/shared';
import { Card, EmptyBlock, Screen } from '@/components/Screen';
import { ApiError, fetchNotifications } from '@/lib/api';
import { clearToken, loadToken } from '@/lib/auth-store';
import { colors } from '@/lib/theme';

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationDto[]>([]);
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
      setItems(await fetchNotifications(token));
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

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      title="Лента"
      subtitle="Уведомления деканата"
      loading={loading}
      error={error}
      onRetry={() => void load()}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      {!loading && !error && items.length === 0 ? (
        <EmptyBlock
          title="Тишина"
          description="Когда появятся уведомления — они будут здесь."
        />
      ) : null}

      {items.map((n) => {
        const unread = !n.readAt;
        return (
          <Card key={n.id}>
            <View style={styles.row}>
              <Text style={styles.kind}>{n.kind}</Text>
              {unread ? <Text style={styles.unread}>новое</Text> : null}
            </View>
            <Text style={[styles.title, unread && styles.titleUnread]}>
              {n.title}
            </Text>
            <Text style={styles.body}>{n.body}</Text>
            <Text style={styles.meta}>
              {new Date(n.createdAt).toLocaleString('ru-RU')}
            </Text>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  kind: {
    color: colors.inkMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unread: {
    color: colors.copper,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  titleUnread: { fontWeight: '700' },
  body: { color: colors.inkMuted, marginTop: 6, fontSize: 14, lineHeight: 20 },
  meta: { color: colors.inkMuted, marginTop: 8, fontSize: 12 },
});
