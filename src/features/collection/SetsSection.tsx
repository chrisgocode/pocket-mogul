import type { CollectionSetsView } from '@/application/collectionSetsView';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';
import { AppText } from '@/ui/Typography';

import { perkLabel, setNote, setsNote } from './collectionFormat';

export function SetsSection({ sets }: { sets: CollectionSetsView }) {
  return (
    <Section title="Sets" note={setsNote(sets)}>
      {sets.sets.map((set) => (
        <Card key={set.id}>
          <ListRow
            title={set.name}
            subtitle={`${set.categoryName} · ${perkLabel(set.perk)}`}
            value={`${set.heldCount} of ${set.pieceCount}`}
          />
          <AppText variant="caption" muted>
            {setNote(set)}
          </AppText>
        </Card>
      ))}
    </Section>
  );
}
