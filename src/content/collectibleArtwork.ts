import manifest from './collectible-artwork.json';
import { parseArtwork, type ArtworkSources } from './artworkSchema';
import { collection } from './economy-collection';

const artwork = parseArtwork(
  manifest,
  collection.pieces.map((piece) => piece.id),
);

export function collectibleArtwork(pieceId: string): ArtworkSources | undefined {
  return artwork[pieceId];
}
