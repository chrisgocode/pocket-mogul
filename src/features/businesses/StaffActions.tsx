import { StyleSheet, View } from 'react-native';

import type { AvailableHire, StaffOption } from '@/application/businessDetailView';
import { Button } from '@/ui/Button';
import { spacing } from '@/ui/tokens';

import { HireButton } from './HireButton';

type CountedStaff = Exclude<StaffOption, { status: 'locked' }>;

export function StaffActions({
  role,
  option,
  onHire,
  onFire,
}: {
  role: string;
  option: CountedStaff;
  onHire: (hire: AvailableHire) => void;
  onFire: (option: CountedStaff) => void;
}) {
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
