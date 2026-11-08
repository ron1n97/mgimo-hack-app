import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function RequestsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="new"
        options={{ title: 'Новая заявка', presentation: 'card' }}
      />
    </Stack>
  );
}
