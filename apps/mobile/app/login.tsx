import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { DEMO_ACCOUNTS } from '@dekanat/shared';
import { Disclaimer } from '@/components/Disclaimer';
import { login } from '@/lib/api';
import { saveToken } from '@/lib/auth-store';
import { colors } from '@/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState<string>(DEMO_ACCOUNTS[0].password);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const auth = await login(email.trim(), password);
      await saveToken(auth.accessToken);
      router.replace('/today');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.brand}>Деканат+</Text>
      <Text style={styles.sub}>Вход в кабинет</Text>
      <Disclaimer compact />

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="почта"
        placeholderTextColor={colors.inkMuted}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder="пароль"
        placeholderTextColor={colors.inkMuted}
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => void onSubmit()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.cream} />
        ) : (
          <Text style={styles.buttonText}>Войти</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: colors.cream,
    gap: 12,
  },
  brand: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  sub: {
    color: colors.inkMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.creamDeep,
    backgroundColor: colors.white,
    color: colors.ink,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.copper,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: colors.cream,
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    color: colors.copperDark,
    marginTop: 4,
  },
});
