import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { TodayResponse } from '@dekanat/shared';
import { Card, EmptyBlock, Screen } from '@/components/Screen';
import { ApiError, fetchToday } from '@/lib/api';
import { clearToken, loadToken } from '@/lib/auth-store';
import { formatRuLong } from '@/lib/dates';
import { colors } from '@/lib/theme';

export default function TodayScreen() {
  const [data, setData] = useState<TodayResponse | null>(null);
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
      const hub = await fetchToday(token);
      setData(hub);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearToken();
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onLogout() {
    await clearToken();
    router.replace('/login');
  }

  const next = data?.lessons?.[0];
  const openCount = data?.openRequests?.length ?? 0;
  const unreadCount = data?.unreadNotifications?.length ?? 0;
  const debtCount = data?.debts?.length ?? 0;

  return (
    <Screen
      title="Сегодня"
      subtitle={formatRuLong(data?.date)}
      loading={loading}
      error={error}
      onRetry={() => void load()}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      headerRight={
        <Pressable onPress={() => void onLogout()} hitSlop={8}>
          <Text style={styles.logout}>Выйти</Text>
        </Pressable>
      }
    >
      {data ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Следующая пара</Text>
            {next ? (
              <>
                <Text style={styles.heroTitle}>{next.discipline}</Text>
                <Text style={styles.heroMeta}>
                  {next.begin}–{next.end}
                  {next.auditorium ? ` · ${next.auditorium}` : ''}
                </Text>
                {next.lecturer ? (
                  <Text style={styles.heroSub}>{next.lecturer}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.heroMeta}>На сегодня пар нет</Text>
            )}
            <Pressable onPress={() => router.push('/schedule')}>
              <Text style={styles.link}>Неделя →</Text>
            </Pressable>
          </View>

          <View style={styles.stats}>
            <Pressable
              style={styles.stat}
              onPress={() => router.push('/requests')}
            >
              <Text style={styles.statLabel}>Заявки</Text>
              <Text style={styles.statValue}>{openCount}</Text>
              <Text style={styles.statHint}>открытых</Text>
            </Pressable>
            <Pressable
              style={styles.stat}
              onPress={() => router.push('/notifications')}
            >
              <Text style={styles.statLabel}>Лента</Text>
              <Text style={styles.statValue}>{unreadCount}</Text>
              <Text style={styles.statHint}>непрочитанных</Text>
            </Pressable>
          </View>

          {debtCount > 0 ? (
            <Card>
              <Text style={styles.sectionTitle}>Академ. риски</Text>
              <Text style={styles.debt}>
                Долгов: {debtCount}. Смотрите вкладку «Оценки».
              </Text>
            </Card>
          ) : null}

          <Text style={styles.sectionTitle}>Пары сегодня</Text>
          {data.lessons.length === 0 ? (
            <EmptyBlock
              title="Свободный день"
              description="Расписание на сегодня пустое."
            />
          ) : (
            data.lessons.map((l) => (
              <Card key={l.id}>
                <Text style={styles.time}>
                  {l.begin}–{l.end}
                </Text>
                <Text style={styles.lessonTitle}>{l.discipline}</Text>
                <Text style={styles.meta}>
                  {[l.auditorium, l.lecturer].filter(Boolean).join(' · ')}
                </Text>
              </Card>
            ))
          )}

          {data.summary ? (
            <Text style={styles.summary}>{data.summary}</Text>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  logout: { color: colors.copper, fontWeight: '600', fontSize: 14 },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  heroLabel: {
    color: 'rgba(243,234,220,0.6)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: colors.cream,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  heroMeta: { color: 'rgba(243,234,220,0.85)', marginTop: 8, fontSize: 14 },
  heroSub: { color: 'rgba(243,234,220,0.55)', marginTop: 4, fontSize: 13 },
  link: { color: colors.copper, marginTop: 14, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.creamDeep,
    padding: 14,
  },
  statLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 6,
  },
  statHint: { color: colors.inkMuted, fontSize: 13, marginTop: 2 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  time: { color: colors.copper, fontWeight: '600' },
  lessonTitle: { color: colors.ink, fontSize: 16, marginTop: 4, fontWeight: '600' },
  meta: { color: colors.inkMuted, marginTop: 4, fontSize: 13 },
  debt: { color: colors.copperDark, marginTop: 4 },
  summary: { color: colors.inkMuted, fontSize: 13, marginTop: 8 },
});
