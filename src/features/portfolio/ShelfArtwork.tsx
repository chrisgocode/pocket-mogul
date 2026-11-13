import type { Showpiece } from '@/application/collectionSetsView';
import { CollectibleArtwork } from '@/features/collection/CollectibleArtwork';
import { Icon } from '@/ui/Icons';
import { colors } from '@/ui/tokens';

export function ShelfArtwork({ showpiece }: { showpiece: Showpiece | undefined }) {
  if (showpiece === undefined) return <Icon name="collection" color={colors.text} />;
  return (
    <CollectibleArtwork
      pieceId={showpiece.id}
      categoryName={showpiece.categoryName}
      size="thumbnail"
    />
  );
}
