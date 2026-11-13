import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedAirlineCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Operations" note="Where your fleet flies">
      <Card>
        <ListRow
          title="Routes and fuel"
          subtitle="Choose the network your fleet flies and plan around the fuel price"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
