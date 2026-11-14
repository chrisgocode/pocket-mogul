import { StyleSheet, View } from 'react-native';

import type { RichListRow } from '@/application/richListView';
import { formatMoneyCompact } from '@/domain/money';
import { ListRow } from '@/ui/ListRow';
import { AppText } from '@/ui/Typography';
import { colors, radius, spacing } from '@/ui/tokens';

export function RichListRowLine({ row }: { row: RichListRow }) {
  const fortune = formatMoneyCompact(row.fortuneCents);
  const isPlayer = row.who === 'player';
  return (
    <View style={isPlayer ? styles.player : undefined}>
      <ListRow
        leading={
          <AppText variant="number" muted={!isPlayer} style={styles.place}>
            {String(row.place)}
          </AppText>
        }
        title={row.name}
        subtitle={row.sector}
        value={fortune}
        accessibilityLabel={`Number ${row.place}, ${row.name}, ${row.sector}, ${fortune}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  place: { width: spacing.xl, textAlign: 'center' },
  player: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
  },
});
