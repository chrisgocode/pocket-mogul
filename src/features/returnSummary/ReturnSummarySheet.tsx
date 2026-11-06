import { Modal, StyleSheet, View } from 'react-native';

import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';
import { colors, radius, spacing } from '@/ui/tokens';

import { useReturnSummary } from './useReturnSummary';

export function ReturnSummarySheet() {
  const { summary, dismiss } = useReturnSummary();
  if (summary === undefined) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={dismiss}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <AppText variant="title" accessibilityRole="header">
            Welcome back
          </AppText>
          <DetailLine label="Time away" value={summary.awayLabel} />
          <DetailLine label="Credited" value={summary.creditedLabel} />
          {summary.capReached ? (
            <AppText muted>{`You reached the ${summary.capLabel} offline cap.`}</AppText>
          ) : null}
          <View style={styles.divider} />
          {summary.earnings.map((line) => (
            <DetailLine key={line.label} label={line.label} value={formatMoneyExact(line.cents)} />
          ))}
          <DetailLine label="Total earned" value={formatMoneyExact(summary.totalCents)} emphasis />
          <Button label="Continue" onPress={dismiss} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
