import { StyleSheet, View } from 'react-native';

import type { BulkOfferView } from '@/application/factoryView';
import { formatMoneyExact } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import type { FactoryActions } from './factoryFormat';

export function BulkOfferRow({
  offer,
  onAnswer,
}: {
  offer: BulkOfferView;
  onAnswer: FactoryActions['answerBulkOffer'];
}) {
  const terms = `${offer.batchesPerDay} batches a day for ${offer.daysLeft} days`;
  const penalty = `${formatMoneyExact(offer.penaltyCents)} penalty a missed batch`;
  const change = `${formatCashChange(offer.profitChangeCents)} a day today`;
  return (
    <View style={styles.offer}>
      <ListRow
        title={`Offer: ${offer.client}`}
        subtitle={`${terms} · ${penalty} · ${change}`}
        value={`${formatMoneyExact(offer.rateCents)} a batch`}
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
