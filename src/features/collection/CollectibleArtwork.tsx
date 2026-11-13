import { collectibleArtwork } from '@/content/collectibleArtwork';
import { Artwork, type ArtworkSize } from '@/ui/Artwork';

export function CollectibleArtwork({
  pieceId,
  categoryName,
  size = 'card',
}: {
  pieceId: string;
  categoryName: string;
  size?: ArtworkSize;
}) {
  return <Artwork sources={collectibleArtwork(pieceId)} label={categoryName} size={size} />;
}
