import { StyleSheet, View } from 'react-native';

import type { AvailableImprovement, ImprovementOption } from '@/application/businessDetailView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { profitGain, TRACK_EFFECTS, TRACK_NAMES } from './businessFormat';

export function BusinessUpgradeRow({
  improvement,
  maxLevel,
  onReview,
}: {
  improvement: ImprovementOption;
  maxLevel: number;
  onReview: (improvement: AvailableImprovement) => void;
}) {
  const track = TRACK_NAMES[improvement.label];
  const title = `${track} ${improvement.level}/${maxLevel}`;
  const effect = TRACK_EFFECTS[improvement.label];
  if (improvement.status === 'max') {
    return <ListRow title={title} subtitle={effect} value="Max level" />;
  }
  const benefit = profitGain(improvement.profitCents, improvement.nextProfitCents);
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
