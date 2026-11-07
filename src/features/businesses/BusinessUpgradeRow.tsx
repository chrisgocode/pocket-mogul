import { StyleSheet, View } from 'react-native';

import type { AvailableImprovement, ImprovementOption } from '@/application/businessDetailView';
import { moneyCents } from '@/domain/money';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { formatPerDay, TRACK_EFFECTS, TRACK_NAMES } from './businessFormat';

export function BusinessUpgradeRow({
  improvement,
  maxLevel,
  onReview,
}: {
  improvement: ImprovementOption;
  maxLevel: number;
  onReview: (improvement: AvailableImprovement) => void;
}) {
  const track = TRACK_NAMES[improvement.track];
  const title = `${track} ${improvement.level}/${maxLevel}`;
  const effect = TRACK_EFFECTS[improvement.track];
  if (improvement.status === 'max') {
    return <ListRow title={title} subtitle={effect} value="Max level" />;
  }
  const gain = moneyCents(improvement.nextProfitCents - improvement.profitCents);
  const benefit = `+${formatPerDay(gain)}`;
  const label = priceLabel('Upgrade', improvement);
  return (
    <View style={styles.upgrade}>
      <ListRow title={title} subtitle={effect} value={benefit} detail="profit" />
      <Button
        label={label}
        accessibilityLabel={`Upgrade ${track}, ${benefit}, ${label}`}
        onPress={() => onReview(improvement)}
        disabled={!improvement.affordable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  upgrade: { gap: spacing.sm },
});
