import { StyleSheet, View } from 'react-native';

import type { Confirmation } from './state/useConfirmation';
import { AppText } from './Typography';
import { colors, spacing } from './tokens';

export type ConfirmationLine = { readonly label: string; readonly value: string };

export function ConfirmationDetails({
  title,
  lines,
  confirmation,
}: {
  title: string;
  lines: readonly ConfirmationLine[];
  confirmation: Confirmation<unknown>;
}) {
  return (
    <>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {lines.map((line) => (
        <View
          key={line.label}
          style={styles.line}
          accessible
          accessibilityLabel={`${line.label}, ${line.value}`}
        >
          <AppText muted style={styles.label}>
            {line.label}
          </AppText>
          <AppText variant="number" style={styles.value}>
            {line.value}
          </AppText>
        </View>
      ))}
      {confirmation.status === 'failed' ? (
        <AppText accessibilityRole="alert" style={styles.error}>
          {confirmation.message}
        </AppText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { flexShrink: 1 },
  value: { flexShrink: 1, textAlign: 'right' },
  error: { color: colors.loss },
});
