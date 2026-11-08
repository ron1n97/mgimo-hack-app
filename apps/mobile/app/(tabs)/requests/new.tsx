import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Disclaimer } from '@/components/Disclaimer';
import { ApiError, createRequest } from '@/lib/api';
import { clearToken, loadToken } from '@/lib/auth-store';
import { REQUEST_TYPES } from '@/lib/labels';
import { colors } from '@/lib/theme';

export default function NewRequestScreen() {
  const [type, setType] = useState<string>(REQUEST_TYPES[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit() {
    setError(null);
    if (title.trim().length < 2 || body.trim().length < 2) {
      setError('Заполните тему и текст (минимум 2 символа).');
      return;
    }
    setSaving(true);
    try {
      const token = await loadToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      await createRequest(token, {
        type,
        title: title.trim(),
        body: body.trim(),
      });
      router.back();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearToken();
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.hint}>Простая форма без ИИ-черновика.</Text>

      <Text style={styles.label}>Тип</Text>
      <View style={styles.types}>
        {REQUEST_TYPES.map((t) => {
          const active = t === type;
          return (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Тема</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Кратко о сути"
        placeholderTextColor={colors.inkMuted}
      />

      <Text style={styles.label}>Текст</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={body}
        onChangeText={setBody}
        placeholder="Опишите запрос"
        placeholderTextColor={colors.inkMuted}
        multiline
        textAlignVertical="top"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={() => void onSubmit()}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.cream} />
        ) : (
          <Text style={styles.buttonText}>Отправить</Text>
        )}
      </Pressable>

      <Disclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 8 },
  hint: { color: colors.inkMuted, marginBottom: 8 },
  label: {
    color: colors.inkMuted,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.creamDeep,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.copper,
    backgroundColor: colors.ink,
  },
  chipText: { color: colors.ink, fontSize: 13 },
  chipTextActive: { color: colors.cream, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.creamDeep,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 16,
  },
  textarea: { minHeight: 120 },
  error: { color: colors.copperDark, marginTop: 8 },
  button: {
    marginTop: 16,
    backgroundColor: colors.copper,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.cream, fontWeight: '700', fontSize: 16 },
});
