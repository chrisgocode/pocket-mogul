import type { CollectionSetsView } from '@/application/collectionSetsView';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { perkLabel, setDetail, setsNote } from './collectionFormat';

export function SetsSection({ sets }: { sets: CollectionSetsView }) {
  return (
    <Section title="Sets" note={setsNote(sets)}>
      <Card>
        {sets.sets.map((set) => (
          <ListRow
            key={set.id}
            title={set.name}
            subtitle={`${set.categoryName} · ${perkLabel(set.perk)}`}
            value={`${set.heldCount} of ${set.pieceCount}`}
            detail={setDetail(set)}
            dimmed={set.status === 'open'}
          />
        ))}
      </Card>
    </Section>
  );
}
