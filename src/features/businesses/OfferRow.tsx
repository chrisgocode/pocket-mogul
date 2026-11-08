import { StyleSheet, View } from 'react-native';

import type { OfferView } from '@/application/deliveryView';
import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { profitGain } from './businessFormat';
import { daysText, parcels, type DeliveryActions } from './deliveryFormat';

function terms(offer: OfferView): string {
  const rate = formatMoneyExact(offer.rateCents);
  const penalty = formatMoneyExact(offer.penaltyCents);
  return `${parcels(offer.parcelsPerDay)}/day for ${daysText(offer.days)} · ${rate} each · ${penalty} per miss · Expires in ${daysText(offer.expiresInDays)}`;
}

export function OfferRow({ offer, actions }: { offer: OfferView; actions: DeliveryActions }) {
  const value = profitGain(offer.profitCents, offer.nextProfitCents);
  return (
    <View style={styles.offer}>
      <ListRow title={offer.client} subtitle={terms(offer)} value={value} detail="profit" />
      <View style={styles.actions}>
        <Button
          label="Review"
          accessibilityLabel={`Review the ${offer.client} contract`}
          onPress={() => actions.accept(offer)}
        />
        <Button
          label="Decline"
          accessibilityLabel={`Decline the ${offer.client} contract`}
          variant="secondary"
          onPress={() => actions.decline(offer.id)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offer: { gap: spacing.sm },
  actions: { gap: spacing.sm },
});
