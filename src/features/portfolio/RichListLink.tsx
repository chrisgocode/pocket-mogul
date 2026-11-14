import { useRouter } from 'expo-router';

import { richListGapText, selectRichList } from '@/application/richListView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { ListRow } from '@/ui/ListRow';

export function RichListLink() {
  const router = useRouter();
  const view = selectRichList(useGameSnapshot().state, getContent());
  if (view.status === 'hidden') return null;
  const gap = richListGapText(view);
  return (
    <ListRow
      title="Rich List"
      subtitle={gap}
      value={`#${view.place}`}
      detail={`of ${view.size}`}
      accessibilityLabel={`Rich List, number ${view.place} of ${view.size}, ${gap}, open the Rich List`}
      onPress={() => router.push('/rich-list')}
    />
  );
}
