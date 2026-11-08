import { StyleSheet, View } from 'react-native';

import type { AvailableUnit, UnitOption } from '@/application/businessDetailView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { profitGain } from './businessFormat';

export function UnitRow({
  unit,
  unitName,
  onReview,
}: {
  unit: UnitOption;
  unitName: string;
  onReview: (unit: AvailableUnit) => void;
}) {
  const title = `Units ${unit.units}/${unit.cap}`;
  const subtitle = `Each ${unitName} adds capacity and customers`;
  if (unit.status === 'at_cap') {
    return <ListRow title={title} subtitle={subtitle} value="At the stage cap" />;
  }
  const benefit = profitGain(unit.profitCents, unit.nextProfitCents);
  const label = priceLabel(`Add a ${unitName}`, unit);
  return (
    <View style={styles.unit}>
      <ListRow title={title} subtitle={subtitle} value={benefit} detail="profit" />
      <Button
        label={label}
        accessibilityLabel={`Add a ${unitName}, ${benefit}, ${label}`}
        onPress={() => onReview(unit)}
        disabled={!unit.affordable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  unit: { gap: spacing.sm },
});
