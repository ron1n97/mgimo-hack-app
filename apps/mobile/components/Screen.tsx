import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer } from '@/components/Disclaimer';
import { colors } from '@/lib/theme';

type ScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerRight?: ReactNode;
  showDisclaimer?: boolean;
};

export function Screen({
  title,
  subtitle,
  children,
  loading,
  error,
  onRetry,
  refreshing,
  onRefresh,
  headerRight,
  showDisclaimer = true,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={colors.copper}
            />
          ) : undefined
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {headerRight}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.copper} />
            <Text style={styles.meta}>Загрузка…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
            {onRetry ? (
              <Pressable onPress={onRetry} style={styles.retry}>
                <Text style={styles.retryText}>Повторить</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {!loading ? children : null}

        {showDisclaimer ? <Disclaimer /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function EmptyBlock({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.meta}>{description}</Text> : null}
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  subtitle: {
    marginTop: 4,
    color: colors.inkMuted,
    fontSize: 14,
  },
  center: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  meta: { color: colors.inkMuted, fontSize: 14 },
  errorBox: {
    backgroundColor: colors.creamDeep,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  error: { color: colors.copperDark },
  retry: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  retryText: { color: colors.cream, fontWeight: '600', fontSize: 13 },
  empty: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { color: colors.ink, fontWeight: '600', fontSize: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.creamDeep,
    padding: 14,
    marginBottom: 10,
  },
});
