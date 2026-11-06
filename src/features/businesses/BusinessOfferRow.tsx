import { StyleSheet, View } from 'react-native';

import type { BusinessOffer } from '@/application/businessesView';
import { formatMoneyExact, formatRatePerMinute } from '@/domain/money';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { LogoMark } from '@/ui/LogoMark';
import { spacing } from '@/ui/tokens';

function buyLabel(offer: BusinessOffer): string {
  return offer.affordable
    ? `Buy · ${formatMoneyExact(offer.business.price)}`
    : `Need ${formatMoneyExact(offer.shortfallCents)} more`;
}

export function BusinessOfferRow({
  offer,
  onReview,
  onManage,
}: {
  offer: BusinessOffer;
  onReview: (offer: BusinessOffer) => void;
  onManage: (offer: BusinessOffer) => void;
}) {
  const { business } = offer;
  const label = buyLabel(offer);
  return (
    <View style={styles.offer}>
      <ListRow
        leading={<LogoMark logo={business.logo} />}
        title={business.name}
        subtitle={`Earns ${formatRatePerMinute(offer.netPerMinuteCents, 'full')} net`}
        value={offer.status === 'owned' ? 'Owned' : formatMoneyExact(business.price)}
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
      {offer.status === 'owned' ? (
        <Button
          label="Manage"
          accessibilityLabel={`Manage ${business.name}`}
          variant="secondary"
          onPress={() => onManage(offer)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  offer: { gap: spacing.sm },
});
