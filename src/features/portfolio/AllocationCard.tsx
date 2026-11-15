import { StyleSheet, View } from 'react-native';

import type { Worth } from '@/application/portfolioView';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import { DetailLine } from '@/ui/DetailLine';
import { spacing } from '@/ui/tokens';

import { allocationParts } from './allocation';

export function AllocationCard({ worth }: { worth: Worth }) {
  return (
    <View style={styles.content}>
      {allocationParts(worth).map((part) => (
        <DetailLine
          key={part.label}
          label={part.label}
          value={`${formatMoneyExact(part.value)} · ${part.share.toFixed(1)}%`}
        />
      ))}
      <DetailLine
        label="Tax liability"
        value={formatMoneyExact(moneyCents(0n - worth.taxLiabilityCents))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
});
