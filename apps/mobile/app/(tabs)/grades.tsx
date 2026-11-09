import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { GradeDto } from '@dekanat/shared';
import { Card, EmptyBlock, Screen } from '@/components/Screen';
import { ApiError, fetchGrades } from '@/lib/api';
import { clearToken, loadToken } from '@/lib/auth-store';
import { colors } from '@/lib/theme';

export default function GradesScreen() {
  const [grades, setGrades] = useState<GradeDto[]>([]);
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
      setGrades(await fetchGrades(token));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearToken();
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setGrades([]);
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
      title="Оценки"
      subtitle="Успеваемость и долги"
      loading={loading}
      error={error}
      onRetry={() => void load()}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      {!loading && !error && grades.length === 0 ? (
        <EmptyBlock
          title="Пока пусто"
          description="Когда появятся результаты — покажем здесь."
        />
      ) : null}

      {grades.map((g) => (
        <Card key={g.id}>
          <View style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.discipline}>{g.discipline}</Text>
              <Text style={styles.meta}>
                {g.semester} · {g.gradeType}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.grade, g.isDebt && styles.debtGrade]}>
                {g.grade}
              </Text>
              {g.isDebt ? <Text style={styles.debt}>долг</Text> : null}
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  left: { flex: 1 },
  right: { alignItems: 'flex-end' },
  discipline: { color: colors.ink, fontWeight: '600', fontSize: 15 },
  meta: { color: colors.inkMuted, marginTop: 4, fontSize: 13 },
  grade: { color: colors.ink, fontWeight: '700', fontSize: 20 },
  debtGrade: { color: colors.copperDark },
  debt: {
    color: colors.copperDark,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
