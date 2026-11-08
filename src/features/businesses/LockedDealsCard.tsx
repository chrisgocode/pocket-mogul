import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedDealsCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Deals">
      <Card>
        <ListRow
          title="Takeovers"
          subtitle="Buy a rival from the treasury and merge its units and quality"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
