import { formatMoneyExact } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ConfirmationSheet } from '@/ui/ConfirmationSheet';
import { Section } from '@/ui/Section';

import { useResetSave } from './useResetSave';

export function ResetSaveSection() {
  const { state } = useGameSnapshot();
  const { confirmation, review, close, confirm } = useResetSave();
  return (
    <Section title="Save" note="Resetting deletes this save for good. It can't be undone.">
      <Card>
        <Button label="Reset save" variant="secondary" onPress={review} />
      </Card>
      <ConfirmationSheet
        confirmation={confirmation}
        title="Reset your save?"
        lines={[
          { label: 'Cash lost', value: formatMoneyExact(state.cashCents) },
          { label: 'Businesses lost', value: String(state.businesses.length) },
          { label: 'Properties lost', value: String(state.properties.length) },
        ]}
        confirmLabel="Delete everything"
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Section>
  );
}
