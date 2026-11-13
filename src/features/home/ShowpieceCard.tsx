import { useRouter } from 'expo-router';

import { selectShelf } from '@/application/collectionSetsView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { CollectibleArtwork } from '@/features/collection/CollectibleArtwork';
import { ListRow } from '@/ui/ListRow';

export function ShowpieceCard() {
  const router = useRouter();
  const { showpiece } = selectShelf(useGameSnapshot().state, getContent());
  if (showpiece === undefined) return null;
  return (
    <ListRow
      leading={
        <CollectibleArtwork
          pieceId={showpiece.id}
          categoryName={showpiece.categoryName}
          size="thumbnail"
        />
      }
      title={showpiece.name}
      subtitle={`On show · ${showpiece.note}`}
      accessibilityLabel={`On show, ${showpiece.name}, open the Collection`}
      onPress={() => router.push('/collection')}
    />
  );
}
