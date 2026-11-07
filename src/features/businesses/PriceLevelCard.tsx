import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import type { PriceLevel } from '@/domain/business/definition';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';

import { formatPerDay, PRICE_LEVEL_NAMES } from './businessFormat';

function bestNote(detail: OwnedBusinessDetail): string {
  if (detail.managerHired) return 'Your manager sets the best price at the start of each day';
  const best = detail.priceLevels.find((option) => option.best);
  if (best === undefined) return '';
  return `Best now: ${PRICE_LEVEL_NAMES[best.priceLevel]}, ${formatPerDay(best.profitCents)} profit`;
}

export function PriceLevelCard({
  detail,
  onSelect,
}: {
  detail: OwnedBusinessDetail;
  onSelect: (priceLevel: PriceLevel) => void;
}) {
  const choices = detail.priceLevels.map((option) => ({
    value: option.priceLevel,
    label: `${PRICE_LEVEL_NAMES[option.priceLevel]}${option.best ? ' ★' : ''}`,
  }));
  return (
    <Card>
      <ChoiceRow
        title="Price"
        note={bestNote(detail)}
        choices={choices}
        selected={detail.priceLevel}
        onSelect={onSelect}
      />
    </Card>
  );
}
