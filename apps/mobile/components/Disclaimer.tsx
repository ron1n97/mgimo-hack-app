import { StyleSheet, Text } from 'react-native';
import { CONTEST_DISCLAIMER } from '@/lib/labels';
import { colors } from '@/lib/theme';

type Props = {
  compact?: boolean;
};

export function Disclaimer({ compact }: Props) {
  return (
    <Text style={[styles.text, compact && styles.compact]}>
      {CONTEST_DISCLAIMER}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  compact: {
    marginTop: 8,
    marginBottom: 0,
    fontSize: 11,
  },
});
