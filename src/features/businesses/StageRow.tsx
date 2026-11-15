import type { ReadyStage, StageOption } from '@/application/businessDetailView';
import { formatMoneyExact } from '@/domain/money';
import { priceLabel } from '@/features/game/priceFormat';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { ActionRow } from '@/ui/ActionRow';
import { ListRow } from '@/ui/ListRow';

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
  const format = useMoneyFormat();
  const title = `Stage ${stageName(stage.stage)}`;
  if (stage.status === 'final') {
    return <ListRow title={title} subtitle="The top stage" value="Max stage" />;
  }
  const next = stageName(stage.stage + 1);
  const needs = `Units ${stage.units}/${stage.unitsNeeded} · Days owned ${Math.min(stage.daysOwned, stage.daysNeeded)}/${stage.daysNeeded}`;
  const ready = stage.status === 'ready' ? stage : undefined;
  return (
    <ActionRow
      title={title}
      subtitle={`Next: ${next}. Needs ${needs}`}
      action={{
        label: format.short(stage.priceCents),
        accessibilityLabel: stageButtonLabel(stage, next),
        disabled: ready === undefined || !ready.affordable,
        onPress: () => (ready === undefined ? undefined : onReview(ready)),
      }}
    />
  );
}
