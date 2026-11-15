import type { BusinessSale } from '@/application/businessDetailView';
import { formatMoneyExact } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';

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
  const format = useMoneyFormat();
  return (
    <Card>
      <AppText variant="heading">Sell</AppText>
      <AppText muted>
        {sale.listed === true
          ? 'Pays your stake at market price after the stock sell fee. Treasury is already included in that share value.'
          : `Pays ${returnPercent}% of the ${formatMoneyExact(sale.spendCents)} spent on purchase, units and upgrades, plus its ${formatMoneyExact(sale.treasuryCents)} treasury.`}
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
