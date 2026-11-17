import type { AvailableImprovement, ImprovementOption } from '@/application/businessDetailView';
import { priceLabel } from '@/features/game/priceFormat';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { ActionRow } from '@/ui/ActionRow';
import { ListRow } from '@/ui/ListRow';

import { profitGain, TRACK_EFFECTS, TRACK_NAMES } from './businessFormat';

export function BusinessUpgradeRow({
  improvement,
  maxLevel,
  onBuy,
}: {
  improvement: ImprovementOption;
  maxLevel: number;
  onBuy: (improvement: AvailableImprovement) => void;
}) {
  const format = useMoneyFormat();
  const track = TRACK_NAMES[improvement.label];
  const title = `${track} ${improvement.level}/${maxLevel}`;
  const effect = TRACK_EFFECTS[improvement.label];
  if (improvement.status === 'max') {
    return <ListRow title={title} subtitle={effect} value="Max level" />;
  }
  const benefit = profitGain(improvement.profitCents, improvement.nextProfitCents);
  return (
    <ActionRow
      title={title}
      subtitle={effect}
      benefit={`${benefit} profit`}
      accessibilityLabel={`${title}, ${effect}, ${benefit}, profit`}
      action={{
        label: format.short(improvement.priceCents),
        accessibilityLabel: `Upgrade ${track}, ${benefit}, ${priceLabel('Upgrade', improvement)}`,
        disabled: !improvement.affordable,
        onPress: () => onBuy(improvement),
      }}
    />
  );
}
