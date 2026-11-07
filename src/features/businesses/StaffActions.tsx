import { StyleSheet, View } from 'react-native';

import type { AvailableHire, StaffOption } from '@/application/businessDetailView';
import { Button } from '@/ui/Button';
import { spacing } from '@/ui/tokens';

import { ROLE_NAMES } from './businessFormat';
import { HireButton } from './HireButton';

type CountedStaff = Exclude<StaffOption, { status: 'locked' }>;

export function StaffActions({
  option,
  onHire,
  onFire,
}: {
  option: CountedStaff;
  onHire: (hire: AvailableHire) => void;
  onFire: (option: CountedStaff) => void;
}) {
  const role = ROLE_NAMES[option.role];
  return (
    <View style={styles.actions}>
      {option.status === 'available' ? (
        <HireButton hire={option} role={role} onHire={onHire} />
      ) : null}
      {option.count > 0 ? (
        <Button
          label="Let go"
          accessibilityLabel={`Let go of one ${role}`}
          variant="secondary"
          onPress={() => onFire(option)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
});
