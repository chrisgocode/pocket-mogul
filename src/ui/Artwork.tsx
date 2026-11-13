import type { ArtworkSources } from '@/content/artworkSchema';

import { ArtworkImage } from './ArtworkImage';

export type ArtworkSize = 'card' | 'thumbnail';

export function Artwork({
  sources,
  label,
  size = 'card',
}: {
  sources: ArtworkSources | undefined;
  label: string;
  size?: ArtworkSize;
}) {
  return (
    <ArtworkImage
      key={sources?.map((source) => source.uri).join('|') ?? label}
      sources={sources}
      label={label}
      size={size}
    />
  );
}
