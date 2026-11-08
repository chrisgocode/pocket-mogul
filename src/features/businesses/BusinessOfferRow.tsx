import { StyleSheet, View } from 'react-native';

import type { BusinessOffer } from '@/application/businessesView';
import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { BusinessArt } from '@/ui/BusinessArt';
import { colors, highlightWidth, radius, spacing } from '@/ui/tokens';

import { formatPerDay } from './businessFormat';

function buyLabel(offer: BusinessOffer): string {
  return offer.affordable
    ? `Buy · ${formatMoneyExact(offer.business.price)}`
    : `Need ${formatMoneyExact(offer.shortfallCents)} more`;
}

type BusinessOfferRowProps = {
  offer: BusinessOffer;
  highlighted: boolean;
  onReview: (offer: BusinessOffer) => void;
  onManage: (offer: BusinessOffer) => void;
};

export function BusinessOfferRow({
  offer,
  highlighted,
  onReview,
  onManage,
}: BusinessOfferRowProps) {
  const { business } = offer;
  const label = buyLabel(offer);
  return (
    <View style={[styles.offer, highlighted && styles.highlighted]}>
      <ListRow
        leading={<BusinessArt id={business.id} />}
        title={business.name}
        subtitle={
          offer.operation === 'closed'
            ? 'Closed · deposit to reopen'
            : `Profit ${formatPerDay(offer.profitPerDayCents)}`
        }
        value={offer.status === 'owned' ? 'Manage →' : formatMoneyExact(business.price)}
        onPress={offer.status === 'owned' ? () => onManage(offer) : undefined}
        dimmed={offer.status === 'locked'}
      />
      {offer.status === 'available' ? (
        <Button
          label={label}
          accessibilityLabel={`Buy ${business.name}, ${label}`}
          onPress={() => onReview(offer)}
          disabled={!offer.affordable}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  offer: { gap: spacing.sm },
  highlighted: {
    borderWidth: highlightWidth,
    borderColor: colors.highlight,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
});
