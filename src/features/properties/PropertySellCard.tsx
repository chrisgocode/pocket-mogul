import type { PropertySale } from '@/application/propertyDetailView';
import { formatMoneyExact } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';

export function PropertySellCard({
  name,
  sale,
  valueUpgradePercent,
  onReview,
}: {
  name: string;
  sale: PropertySale;
  valueUpgradePercent: number;
  onReview: () => void;
}) {
  const format = useMoneyFormat();
  return (
    <Card>
      <AppText variant="heading">Sell</AppText>
      <AppText muted>
        Pays {sale.salePercent}% of the {formatMoneyExact(sale.valueCents)} estimated value: the
        purchase price plus {valueUpgradePercent}% of upgrade spending.
      </AppText>
      <Button
        label={`Sell · ${format.shortGain(sale.proceedsCents)}`}
        accessibilityLabel={`Sell ${name}, Sell · ${formatCashChange(sale.proceedsCents)}`}
        variant="secondary"
        onPress={onReview}
      />
    </Card>
  );
}
