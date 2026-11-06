import { StyleSheet, View } from 'react-native';

import type { TradeSide } from '@/domain/trading';
import { Button } from '@/ui/Button';
import { AppText } from '@/ui/Typography';
import { spacing } from '@/ui/tokens';

import type { ListedAsset } from './AssetOverview';
import { WatchlistToggle } from './WatchlistToggle';

export function TradeActions({
  detail,
  onTrade,
  onWatch,
}: {
  detail: ListedAsset;
  onTrade: (side: TradeSide) => void;
  onWatch: (watched: boolean) => void;
}) {
  const locked = detail.trading === 'locked';
  const holding = detail.position !== undefined && detail.position.quantity > 0n;
  const { name } = detail.asset;
  return (
    <View style={styles.actions}>
      {locked ? <AppText muted>Trading opens after you buy your first business.</AppText> : null}
      <View style={styles.row}>
        <View style={styles.cell}>
          <Button
            label="Buy"
            accessibilityLabel={`Buy ${name}`}
            onPress={() => onTrade('buy')}
            disabled={locked}
          />
        </View>
        <View style={styles.cell}>
          <Button
            label="Sell"
            accessibilityLabel={`Sell ${name}`}
            onPress={() => onTrade('sell')}
            disabled={locked || !holding}
          />
        </View>
      </View>
      <WatchlistToggle watched={detail.watched} onWatch={onWatch} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
});
