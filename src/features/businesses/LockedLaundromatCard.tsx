import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedLaundromatCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Floor" note="Which machines you run and who washes for whom">
      <Card>
        <ListRow
          title="Machine mix and service washes"
          subtitle="Add jumbo machines for big loads and take drop-off washes at a premium"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
