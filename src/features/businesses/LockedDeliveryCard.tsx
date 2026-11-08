import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedDeliveryCard({
  unlockStage,
  vansPerDriver,
}: {
  unlockStage: number;
  vansPerDriver: number;
}) {
  return (
    <Section title="Contracts" note="Who you deliver for and how reliably">
      <Card>
        <ListRow
          title="Contracts and reputation"
          subtitle={`Take on client contracts. From ${stageName(unlockStage)}, each driver runs ${vansPerDriver} vans and a van without a driver delivers nothing`}
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
