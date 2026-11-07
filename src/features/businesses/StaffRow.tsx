import { StyleSheet, View } from 'react-native';

import type { AvailableHire, StaffOption } from '@/application/businessDetailView';
import { moneyCents } from '@/domain/money';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { formatPerDay, ROLE_EFFECTS, ROLE_NAMES, stageName } from './businessFormat';
import { StaffActions } from './StaffActions';

type CountedStaff = Exclude<StaffOption, { status: 'locked' }>;

function benefit(option: CountedStaff): { value: string; detail?: string } {
  if (option.status === 'at_cap') return { value: 'At the stage cap' };
  const gain = moneyCents(option.nextProfitCents - option.profitCents);
  return { value: `${gain < 0n ? '' : '+'}${formatPerDay(gain)}`, detail: 'profit' };
}

export function StaffRow({
  option,
  onHire,
  onFire,
}: {
  option: StaffOption;
  onHire: (hire: AvailableHire) => void;
  onFire: (option: CountedStaff) => void;
}) {
  const role = ROLE_NAMES[option.role];
  const effect = ROLE_EFFECTS[option.role];
  if (option.status === 'locked') {
    return (
      <ListRow
        title={role}
        subtitle={effect}
        value={`Unlocks at ${stageName(option.unlockStage)}`}
        dimmed
      />
    );
  }
  const subtitle = `${effect} · Wage ${formatPerDay(option.wageCents)}`;
  return (
    <View style={styles.row}>
      <ListRow
        title={`${role} ${option.count}/${option.cap}`}
        subtitle={subtitle}
        {...benefit(option)}
      />
      <StaffActions option={option} onHire={onHire} onFire={onFire} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
});
