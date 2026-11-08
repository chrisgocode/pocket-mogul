import { getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { taxActionDetails } from '@/features/taxes/taxActionDetails';
import { useGameSnapshot } from './GameContext';
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
  taxCommand,
  onConfirm,
  onCancel,
}: {
  confirmation: Confirmation<Action>;
  describe: (action: Action) => ActionSheetText;
  taxCommand?: (action: Action) => GameCommand;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const snapshot = useGameSnapshot();
  const original = confirmation.status === 'closed' ? CLOSED_TEXT : describe(confirmation.subject);
  const text =
    taxCommand === undefined || confirmation.status === 'closed'
      ? original
      : taxActionDetails(original, {
          state: snapshot.state,
          content: getContent(),
          command: taxCommand(confirmation.subject),
        });
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
