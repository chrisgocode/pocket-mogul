import { StyleSheet, View } from 'react-native';

import type { VendingSpotView } from '@/application/vendingView';
import { HOME_LOCATION } from '@/domain/business/vendingRules';
import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { spacing } from '@/ui/tokens';

import { LOCATION_NAMES, type VendingActions } from './vendingFormat';

function restockLabel(spot: VendingSpotView): string {
  if (spot.stock >= spot.fullStock) return 'Fully stocked';
  return `Restock · ${formatMoneyExact(spot.restock.priceCents)}`;
}

export function VendingSpotActions({
  spot,
  actions,
}: {
  spot: VendingSpotView;
  actions: VendingActions;
}) {
  const name = LOCATION_NAMES[spot.location];
  const needsStock = spot.machines > 0 && spot.stock < spot.fullStock;
  return (
    <View style={styles.actions}>
      {spot.machines > 0 ? (
        <Button
          label={restockLabel(spot)}
          accessibilityLabel={`Restock ${name}, ${formatMoneyExact(spot.restock.priceCents)}`}
          onPress={() => actions.restock(spot.location)}
          disabled={!needsStock || !spot.restock.affordable}
        />
      ) : null}
      {spot.placement === 'open' ? (
        <Button
          label="Place a machine here"
          accessibilityLabel={`Place a machine at the ${name}`}
          variant="secondary"
          onPress={() => actions.move({ from: HOME_LOCATION, to: spot.location })}
        />
      ) : null}
      {spot.placement !== 'home' && spot.machines > 0 ? (
        <Button
          label="Move one back to the Office"
          accessibilityLabel={`Move a machine from the ${name} back to the Office`}
          variant="secondary"
          onPress={() => actions.move({ from: spot.location, to: HOME_LOCATION })}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
});
