import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';
import type { LockedText } from './lockedMechanicText';

export function LockedMechanicCard({
  text,
  unlockStage,
}: {
  text: LockedText;
  unlockStage: number;
}) {
  const { feature, summary, ...section } = text;
  return (
    <Section {...section}>
      <Card>
        <ListRow
          title={feature}
          subtitle={summary}
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
