import { StyleSheet, View } from 'react-native';

import type { TradeSide } from '@/domain/tradeQuotes';
import { gameErrorMessage } from '@/features/game/gameErrorMessage';
import { Button } from '@/ui/Button';
import { AppText } from '@/ui/Typography';
import { spacing } from '@/ui/tokens';

import type { ListedAsset } from './AssetOverview';

export function TradeActions({
  detail,
  onTrade,
}: {
  detail: ListedAsset;
  onTrade: (side: TradeSide) => void;
}) {
  const locked = detail.trading === 'locked';
  const holding = detail.position !== undefined && detail.position.quantity > 0n;
  const { name } = detail.asset;
  return (
    <>
      {locked ? (
        <AppText variant="caption" muted>
          {gameErrorMessage('TRADING_LOCKED')}
        </AppText>
      ) : null}
      <View style={styles.row}>
        <View style={styles.cell}>
          <Button
            label="Sell"
            variant="secondary"
            accessibilityLabel={`Sell ${name}`}
            onPress={() => onTrade('sell')}
            disabled={locked || !holding}
          />
        </View>
        <View style={styles.cell}>
          <Button
            label="Buy"
            accessibilityLabel={`Buy ${name}`}
            onPress={() => onTrade('buy')}
            disabled={locked}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
});
