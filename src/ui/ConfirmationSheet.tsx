import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { ConfirmationDetails, type ConfirmationLine } from './ConfirmationDetails';
import type { Confirmation } from './state/useConfirmation';

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
    <BottomSheet visible={confirmation.status !== 'closed'} onRequestClose={onCancel}>
      <ConfirmationDetails title={title} lines={lines} confirmation={confirmation} />
      <Button
        label={confirmLabelFor(confirmation, confirmLabel)}
        onPress={onConfirm}
        disabled={pending}
      />
      <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={pending} />
    </BottomSheet>
  );
}
