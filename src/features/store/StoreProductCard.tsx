import type { StoreRow } from '@/application/storeView';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function StoreProductCard({ row, onBuy }: { row: StoreRow; onBuy: () => void }) {
  const { offer } = row;
  return (
    <Card accessibilityLabel={row.name}>
      <AppText variant="heading">{row.name}</AppText>
      <AppText>{row.pitch}</AppText>
      {row.saving === undefined ? null : <AppText variant="heading">{row.saving}</AppText>}
      {row.finePrint === undefined ? null : (
        <AppText variant="caption" muted>
          {row.finePrint}
        </AppText>
      )}
      {offer.status === 'owned' ? (
        <AppText variant="heading" accessibilityLabel={`${row.name} owned`}>
          Owned
        </AppText>
      ) : (
        <Button
          label={offer.status === 'buying' ? 'Buying…' : `Buy · ${offer.price}`}
          accessibilityLabel={`Buy ${row.name} for ${offer.price}`}
          disabled={offer.status === 'buying'}
          onPress={onBuy}
        />
      )}
    </Card>
  );
}
