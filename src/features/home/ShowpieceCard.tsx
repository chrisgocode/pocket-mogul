import { useRouter } from 'expo-router';

import { selectShelf } from '@/application/collectionSetsView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Icon } from '@/ui/Icons';
import { ListRow } from '@/ui/ListRow';
import { colors } from '@/ui/tokens';

export function ShowpieceCard() {
  const router = useRouter();
  const { showpiece } = selectShelf(useGameSnapshot().state, getContent());
  if (showpiece === undefined) return null;
  return (
    <ListRow
      leading={<Icon name="collection" color={colors.text} />}
      title={showpiece.name}
      subtitle={`On show · ${showpiece.note}`}
      accessibilityLabel={`On show, ${showpiece.name}, open the Collection`}
      onPress={() => router.push('/collection')}
    />
  );
}
