import type { BusinessSale } from '@/application/businessDetailView';
import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

import { formatCashChange } from './businessFormat';

export function SellCard({
  name,
  sale,
  returnPercent,
  onReview,
}: {
  name: string;
  sale: BusinessSale;
  returnPercent: number;
  onReview: () => void;
}) {
  const label = `Sell · ${formatCashChange(sale.proceedsCents)}`;
  return (
    <Card>
      <AppText variant="heading">Sell</AppText>
      <AppText muted>
        Pays {returnPercent}% of the {formatMoneyExact(sale.carryingValueCents)} spent on purchase
        and upgrades. Manager spending is not refunded.
      </AppText>
      <Button
        label={label}
        accessibilityLabel={`Sell ${name}, ${label}`}
        variant="secondary"
        onPress={onReview}
      />
    </Card>
  );
}
