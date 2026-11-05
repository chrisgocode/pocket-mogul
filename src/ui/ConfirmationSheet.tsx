import { Modal, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { ConfirmationDetails, type ConfirmationLine } from './ConfirmationDetails';
import type { Confirmation } from './state/useConfirmation';
import { colors, radius, spacing } from './tokens';

function confirmLabelFor(confirmation: Confirmation<unknown>, label: string): string {
  if (confirmation.status === 'pending') return 'Saving…';
  return confirmation.status === 'failed' ? 'Try again' : label;
}

export function ConfirmationSheet({
  confirmation,
  title,
  lines,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  confirmation: Confirmation<unknown>;
  title: string;
  lines: readonly ConfirmationLine[];
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const pending = confirmation.status === 'pending';
  return (
    <Modal
      visible={confirmation.status !== 'closed'}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <ConfirmationDetails title={title} lines={lines} confirmation={confirmation} />
          <Button
            label={confirmLabelFor(confirmation, confirmLabel)}
            onPress={onConfirm}
            disabled={pending}
          />
          <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={pending} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
});
