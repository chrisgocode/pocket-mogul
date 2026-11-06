import type { AvailableManager, ManagerOption } from '@/application/businessDetailView';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

import { formatRateChange, priceLabel } from './businessFormat';

export function ManagerCard({
  manager,
  bonus,
  onReview,
}: {
  manager: ManagerOption;
  bonus: string;
  onReview: (manager: AvailableManager) => void;
}) {
  if (manager.status === 'hired') {
    return (
      <Card>
        <AppText variant="heading">Manager hired</AppText>
        <AppText muted>{bonus} net profit</AppText>
      </Card>
    );
  }
  const label = priceLabel('Hire', manager);
  return (
    <Card>
      <AppText variant="heading">Manager</AppText>
      <AppText muted>
        {bonus} net profit,{' '}
        {formatRateChange(manager.netPerMinuteCents, manager.nextNetPerMinuteCents)}
      </AppText>
      <Button
        label={label}
        accessibilityLabel={`Hire manager, ${label}`}
        onPress={() => onReview(manager)}
        disabled={!manager.affordable}
      />
    </Card>
  );
}
