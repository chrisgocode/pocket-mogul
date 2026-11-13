import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedHotelCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Front desk" note="What guests pay through the year">
      <Card>
        <ListRow
          title="Seasons and stars"
          subtitle="Plan a room rate for every season and earn stars that raise what guests pay"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
