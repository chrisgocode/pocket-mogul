import { StyleSheet, View } from 'react-native';

import type { OpenRival, TakeoverOffer } from '@/application/takeoverView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { profitGain } from './businessFormat';
import { wholeChance, type TakeoverChoice } from './takeoverFormat';

export function OpenRivalRow({
  rival,
  offer,
  facts,
  onReview,
}: {
  rival: OpenRival;
  offer: TakeoverOffer;
  facts: string;
  onReview: (choice: TakeoverChoice) => void;
}) {
  const chance = `${wholeChance(offer.chanceBps)} chance`;
  return (
    <View style={styles.rival}>
      <ListRow
        title={rival.name}
        subtitle={`${facts} · ${chance} at ${offer.percent}%`}
        value={profitGain(offer.profitCents, offer.nextProfitCents)}
        detail="profit if merged"
      />
      <Button
        label={priceLabel('Make offer', offer)}
        accessibilityLabel={`Make an offer for ${rival.name}, ${priceLabel('Offer', offer)}, ${chance}`}
        disabled={!offer.affordable}
        onPress={() => onReview({ rival, offer })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rival: { gap: spacing.sm },
});
