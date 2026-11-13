import { useRouter } from 'expo-router';

import { selectShelf } from '@/application/collectionSetsView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Icon } from '@/ui/Icons';
import { ListRow } from '@/ui/ListRow';
import { colors } from '@/ui/tokens';

export function CollectionShelf() {
  const router = useRouter();
  const shelf = selectShelf(useGameSnapshot().state, getContent());
  if (shelf.heldCount === 0) return null;
  const counts = `${shelf.heldCount} of ${shelf.pieceCount} pieces · ${shelf.completedSets} of ${shelf.setCount} sets`;
  const shown =
    shelf.showpiece === undefined ? 'Nothing on show' : `On show: ${shelf.showpiece.name}`;
  return (
    <ListRow
      leading={<Icon name="collection" color={colors.text} />}
      title="Collection shelf"
      subtitle={counts}
      detail={shown}
      accessibilityLabel={`Collection shelf, ${counts}, ${shown}`}
      onPress={() => router.push('/collection')}
    />
  );
}
