import { emptyStoreText, selectStore, storeNotice } from '@/application/storeView';
import { useGameSnapshot } from '@/features/game/GameContext';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Typography';

import { StoreProductCard } from './StoreProductCard';
import { useStorefront } from './useStorefront';

export function StoreScreen() {
  const { storefront, front } = useStorefront();
  const { state } = useGameSnapshot();
  const rows = selectStore(state, { catalogue: storefront.catalogue, front });
  const notice = storeNotice(front, 'checkout');
  return (
    <Screen>
      {rows.length === 0 ? <EmptyState {...emptyStoreText(front)} /> : null}
      {rows.map((row) => (
        <StoreProductCard
          key={row.productId}
          row={row}
          onBuy={() => void storefront.buy(row.productId)}
        />
      ))}
      {notice === undefined ? null : <AppText accessibilityRole="alert">{notice}</AppText>}
      <AppText variant="caption" muted>
        Purchases are permanent and belong to your store account. On a new phone or after
        reinstalling, use Restore purchases in Settings.
      </AppText>
    </Screen>
  );
}
