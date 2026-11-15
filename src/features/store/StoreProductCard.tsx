import { StyleSheet, View } from 'react-native';

import type { StoreRow } from '@/application/storeView';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icons';
import { PriceChip } from '@/ui/PriceChip';
import { AppText } from '@/ui/Typography';
import { colors, radius, size, spacing } from '@/ui/tokens';

export function StoreProductCard({ row, onBuy }: { row: StoreRow; onBuy: () => void }) {
  const { offer } = row;
  return (
    <Card accessibilityLabel={row.name} highlighted={row.saving !== undefined}>
      <View style={styles.row}>
        <View style={styles.disc}>
          <Icon name="store" color={colors.gold} size={size.iconMedium} />
        </View>
        <View style={styles.text}>
          <AppText variant="heading">{row.name}</AppText>
          <AppText variant="caption" muted>
            {row.pitch}
          </AppText>
        </View>
        {offer.status === 'owned' ? (
          <PriceChip icon="check" label="Owned" accessibilityLabel={`${row.name} owned`} />
        ) : (
          <Button
            size="compact"
            label={offer.status === 'buying' ? 'Buying…' : offer.price}
            accessibilityLabel={`Buy ${row.name} for ${offer.price}`}
            disabled={offer.status === 'buying'}
            onPress={onBuy}
          />
        )}
      </View>
      {row.saving === undefined ? null : (
        <AppText variant="caption" style={styles.saving}>
          {row.saving}
        </AppText>
      )}
      {row.finePrint === undefined ? null : (
        <AppText variant="caption" muted>
          {row.finePrint}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  disc: {
    width: size.rowBadge,
    height: size.rowBadge,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  text: { flex: 1, minWidth: 0, gap: 2 },
  saving: { color: colors.highlight, fontWeight: '700' },
});
