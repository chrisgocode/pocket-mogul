import { StyleSheet, View } from 'react-native';

import type { WholesaleOfferView } from '@/application/bakeryView';
import { formatMoneyExact } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import type { BakeryActions } from './bakeryFormat';

export function WholesaleOfferRow({
  offer,
  onAnswer,
}: {
  offer: WholesaleOfferView;
  onAnswer: BakeryActions['answerOffer'];
}) {
  const terms = `${offer.ordersPerDay} orders a day for ${offer.daysLeft} days at ${offer.pricePercent}% of retail`;
  const change = `${formatCashChange(offer.profitChangeCents)} a day today`;
  return (
    <View style={styles.offer}>
      <ListRow
        title={`Offer: ${offer.client}`}
        subtitle={`${terms} · ${change}`}
        value={`${formatMoneyExact(offer.feeCents)}/day`}
      />
      <View style={styles.answers}>
        <Button
          label={`Accept ${offer.client}`}
          onPress={() => onAnswer({ offerId: offer.id, answer: 'accept' })}
        />
        <Button
          label="Decline"
          variant="secondary"
          onPress={() => onAnswer({ offerId: offer.id, answer: 'decline' })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offer: { gap: spacing.sm },
  answers: { gap: spacing.sm },
});
