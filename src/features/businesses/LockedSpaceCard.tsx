import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedSpaceCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Mission control" note="When you launch and for whom">
      <Card>
        <ListRow
          title="Launch cadence and payloads"
          subtitle="Set your launch cadence by the weather and sign payload contracts"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
