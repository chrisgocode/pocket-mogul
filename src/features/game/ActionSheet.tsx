import type { ConfirmationLine } from '@/ui/ConfirmationDetails';
import { ConfirmationSheet } from '@/ui/ConfirmationSheet';
import type { Confirmation } from '@/ui/state/useConfirmation';

export type ActionSheetText = {
  readonly title: string;
  readonly lines: readonly ConfirmationLine[];
  readonly confirmLabel: string;
};

const CLOSED_TEXT: ActionSheetText = { title: '', lines: [], confirmLabel: 'Confirm' };

export function ActionSheet<Action>({
  confirmation,
  describe,
  onConfirm,
  onCancel,
}: {
  confirmation: Confirmation<Action>;
  describe: (action: Action) => ActionSheetText;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const text = confirmation.status === 'closed' ? CLOSED_TEXT : describe(confirmation.subject);
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
