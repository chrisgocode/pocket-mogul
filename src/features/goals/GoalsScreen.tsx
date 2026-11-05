import { getContent } from '@/content';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';

export function GoalsScreen() {
  const { goals } = getContent();
  return (
    <Screen>
      <Card>
        {goals.map((g) => (
          <ListRow key={g.id} title={g.title} detail="Not reached" />
        ))}
      </Card>
    </Screen>
  );
}
