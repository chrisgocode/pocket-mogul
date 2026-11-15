import type { AvailableUnit, UnitOption } from '@/application/businessDetailView';
import { priceLabel } from '@/features/game/priceFormat';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { ActionRow } from '@/ui/ActionRow';
import { ListRow } from '@/ui/ListRow';

import { profitGain } from './businessFormat';

export function UnitRow({
  unit,
  unitName,
  onReview,
}: {
  unit: UnitOption;
  unitName: string;
  onReview: (unit: AvailableUnit) => void;
}) {
  const format = useMoneyFormat();
  const title = `Units ${unit.units}/${unit.cap}`;
  const subtitle = `Each ${unitName} adds capacity and customers`;
  if (unit.status === 'at_cap') {
    return <ListRow title={title} subtitle={subtitle} value="At the stage cap" />;
  }
  const benefit = profitGain(unit.profitCents, unit.nextProfitCents);
  return (
    <ActionRow
      title={title}
      subtitle={subtitle}
      benefit={`${benefit} profit`}
      accessibilityLabel={`${title}, ${subtitle}, ${benefit}, profit`}
      action={{
        label: format.short(unit.priceCents),
        accessibilityLabel: `Add a ${unitName}, ${benefit}, ${priceLabel(`Add a ${unitName}`, unit)}`,
        disabled: !unit.affordable,
        onPress: () => onReview(unit),
      }}
    />
  );
}
