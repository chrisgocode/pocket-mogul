import { ReturnEarnings } from './ReturnEarnings';
import { ReturnTaxLines } from './ReturnTaxLines';
import { StyleSheet, View } from 'react-native';

import { formatMoneyExact, moneyCents } from '@/domain/money';
import { AdRewardButton } from '@/features/adRewards/AdRewardButton';
import { BottomSheet } from '@/ui/BottomSheet';
import { Button } from '@/ui/Button';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';
import { colors } from '@/ui/tokens';

import { useReturnSummary } from './useReturnSummary';

const DOUBLE = 2n;

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
      <ReturnEarnings summary={summary} />
      <ReturnTaxLines taxes={summary.taxes} />
      {summary.incidents.map((incident) => (
        <AppText key={incident.key} muted>
          {`${incident.title}. ${incident.detail}.`}
        </AppText>
      ))}
      {summary.closedBusinesses.map((name) => (
        <AppText key={name} muted>
          {`${name} closed: its treasury ran out. Deposit cash to reopen it.`}
        </AppText>
      ))}
      <AdRewardButton
        offer={{ kind: 'double_offline' }}
        name="Double offline earnings"
        reward={`double to ${formatMoneyExact(moneyCents(summary.totalCents * DOUBLE))}`}
      />
      <Button label="Continue" onPress={dismiss} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
