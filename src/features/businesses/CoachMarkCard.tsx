import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

import { stageName } from './businessFormat';

export function CoachMarkCard({
  unlockStage,
  title,
  body,
  onDismiss,
}: {
  unlockStage: number;
  title: string;
  body: string;
  onDismiss: () => void;
}) {
  return (
    <Card highlighted>
      <AppText variant="caption" muted>
        {`Unlocked at the ${stageName(unlockStage)} stage`}
      </AppText>
      <AppText variant="heading">{title}</AppText>
      <AppText muted>{body}</AppText>
      <Button label="Got it" variant="secondary" onPress={onDismiss} />
    </Card>
  );
}
