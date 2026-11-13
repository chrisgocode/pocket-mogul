import { z } from 'zod';

const variant = (pixels: number) =>
  z
    .object({
      uri: z.url().regex(/^https:\/\/[a-z0-9]+\.ufs\.sh\/f\/[A-Za-z0-9_-]+$/),
      width: z.literal(pixels),
      height: z.literal(pixels),
      bytes: z.number().int().positive().max(100_000),
    })
    .strict();

const artworkSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9_]*$/),
  z.tuple([variant(256), variant(512), variant(1024)]),
);

export type ArtworkSources = z.output<typeof artworkSchema>[string];

export function parseArtwork(value: unknown, pieceIds: readonly string[]) {
  const artwork = artworkSchema.parse(value);
  const unknown = Object.keys(artwork).filter((id) => !pieceIds.includes(id));
  if (unknown.length > 0) throw new Error(`Unknown artwork pieces: ${unknown.join(', ')}`);
  return artwork;
}
