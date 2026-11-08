import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { ScheduleLessonDto } from '@dekanat/shared';
import { Card, EmptyBlock, Screen } from '@/components/Screen';
import { ApiError, fetchSchedule } from '@/lib/api';
import { clearToken, loadToken } from '@/lib/auth-store';
import { formatRuDay, weekRange } from '@/lib/dates';
import { colors } from '@/lib/theme';

export default function ScheduleScreen() {
  const range = useMemo(() => weekRange(), []);
  const [lessons, setLessons] = useState<ScheduleLessonDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const token = await loadToken();
        if (!token) {
          router.replace('/login');
          return;
        }
        const data = await fetchSchedule(token, range.from, range.to);
        setLessons(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await clearToken();
          router.replace('/login');
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setLessons([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range.from, range.to],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleLessonDto[]>();
    for (const lesson of lessons) {
      const list = map.get(lesson.date) ?? [];
      list.push(lesson);
      map.set(lesson.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [lessons]);

  return (
    <Screen
      title="Неделя"
      subtitle={`${range.from} — ${range.to}`}
      loading={loading}
      error={error}
      onRetry={() => void load()}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      {!loading && !error && byDate.length === 0 ? (
        <EmptyBlock
          title="Нет занятий"
          description="Когда API отдаст RUZ/seed — пары появятся здесь."
        />
      ) : null}

      {byDate.map(([date, dayLessons]) => (
        <View key={date} style={styles.day}>
          <Text style={styles.dayTitle}>{formatRuDay(date)}</Text>
          {dayLessons.map((l) => (
            <Card key={l.id}>
              <Text style={styles.time}>
                {l.begin}–{l.end}
                {l.kindOfWork ? ` · ${l.kindOfWork}` : ''}
              </Text>
              <Text style={styles.title}>{l.discipline}</Text>
              <Text style={styles.meta}>
                {[l.auditorium, l.building, l.lecturer]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {l.isCancelled ? (
                <Text style={styles.flag}>Отмена</Text>
              ) : null}
              {l.isMoved ? <Text style={styles.flag}>Перенос</Text> : null}
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: { marginBottom: 8 },
  dayTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  time: { color: colors.copper, fontWeight: '600', fontSize: 13 },
  title: { color: colors.ink, fontSize: 16, marginTop: 4, fontWeight: '600' },
  meta: { color: colors.inkMuted, marginTop: 4, fontSize: 13 },
  flag: { color: colors.copperDark, marginTop: 6, fontWeight: '600', fontSize: 12 },
});
