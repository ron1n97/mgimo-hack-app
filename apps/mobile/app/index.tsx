import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Disclaimer } from '@/components/Disclaimer';
import { loadToken } from '@/lib/auth-store';
import { colors } from '@/lib/theme';

export default function Index() {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    void loadToken().then(setToken);
  }, []);

  if (token === undefined) {
    return (
      <View style={styles.root}>
        <Text style={styles.brand}>Деканат+</Text>
        <ActivityIndicator color={colors.copper} />
        <Disclaimer compact />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/today" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  brand: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
  },
});
