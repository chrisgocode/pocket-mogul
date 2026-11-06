import { ConfirmationSheet } from '@/ui/ConfirmationSheet';
import type { Confirmation } from '@/ui/state/useConfirmation';

import { businessActionSheetText, type BusinessAction } from './businessAction';

const CLOSED_TEXT = { title: '', lines: [], confirmLabel: 'Confirm' };

export function BusinessActionSheet({
  confirmation,
  onConfirm,
  onCancel,
}: {
  confirmation: Confirmation<BusinessAction>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const text =
    confirmation.status === 'closed' ? CLOSED_TEXT : businessActionSheetText(confirmation.subject);
  return (
    <ConfirmationSheet
      confirmation={confirmation}
      title={text.title}
      lines={text.lines}
      confirmLabel={text.confirmLabel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
