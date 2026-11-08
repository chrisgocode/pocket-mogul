import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedVendingCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Locations" note="Where your machines stand and what they sell">
      <Card>
        <ListRow
          title="Locations and stock"
          subtitle="Place machines at five locations, pick what they sell and keep them stocked"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
