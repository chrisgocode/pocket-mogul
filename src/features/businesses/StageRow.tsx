import { StyleSheet, View } from 'react-native';

import type { ReadyStage, StageOption } from '@/application/businessDetailView';
import { formatMoneyExact } from '@/domain/money';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { stageName } from './businessFormat';

type GrowingStage = Exclude<StageOption, { status: 'final' }>;

function stageButtonLabel(stage: GrowingStage, next: string): string {
  if (stage.status === 'ready') return priceLabel(`Grow to ${next}`, stage);
  return `Grow to ${next} · ${formatMoneyExact(stage.priceCents)}`;
}

export function StageRow({
  stage,
  onReview,
}: {
  stage: StageOption;
  onReview: (stage: ReadyStage) => void;
}) {
  const title = `Stage ${stageName(stage.stage)}`;
  if (stage.status === 'final') {
    return <ListRow title={title} subtitle="The top stage" value="Max stage" />;
  }
  const next = stageName(stage.stage + 1);
  const needs = `Units ${stage.units}/${stage.unitsNeeded} · Days owned ${Math.min(stage.daysOwned, stage.daysNeeded)}/${stage.daysNeeded}`;
  const label = stageButtonLabel(stage, next);
  const ready = stage.status === 'ready' ? stage : undefined;
  return (
    <View style={styles.stage}>
      <ListRow title={title} subtitle={`Next: ${next}. Needs ${needs}`} />
      <Button
        label={label}
        accessibilityLabel={label}
        onPress={() => (ready === undefined ? undefined : onReview(ready))}
        disabled={ready === undefined || !ready.affordable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { gap: spacing.sm },
});
