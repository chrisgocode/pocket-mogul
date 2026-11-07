import { StyleSheet, View } from 'react-native';

import { formatMoneyExact } from '@/domain/money';
import { BottomSheet } from '@/ui/BottomSheet';
import { Button } from '@/ui/Button';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';
import { colors } from '@/ui/tokens';

import { useReturnSummary } from './useReturnSummary';

export function ReturnSummarySheet() {
  const { summary, dismiss } = useReturnSummary();
  if (summary === undefined) return null;
  return (
    <BottomSheet visible onRequestClose={dismiss}>
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
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
