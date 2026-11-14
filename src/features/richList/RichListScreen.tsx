import { richListGapText, selectRichList } from '@/application/richListView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Typography';

import { RichListRowLine } from './RichListRowLine';

export function RichListScreen() {
  const view = selectRichList(useGameSnapshot().state, getContent());
  if (view.status === 'hidden')
    return (
      <Screen>
        <EmptyState
          title="The Rich List is not open yet"
          message="Start earning and you will be ranked against twenty moguls."
        />
      </Screen>
    );
  return (
    <Screen>
      <Card>
        <AppText variant="display">{`#${view.place} of ${view.size}`}</AppText>
        <AppText muted>{richListGapText(view)}</AppText>
        <AppText variant="caption" muted>
          Ranked by peak net worth. Fortunes move every business day.
        </AppText>
      </Card>
      <Card>
        {view.rows.map((row) => (
          <RichListRowLine key={row.id} row={row} />
        ))}
      </Card>
    </Screen>
  );
}
