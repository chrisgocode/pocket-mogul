import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const THUMBNAIL_PIXELS = 256;
const CARD_PIXELS = 512;
const DETAIL_PIXELS = 1024;
const WIDTHS = [THUMBNAIL_PIXELS, CARD_PIXELS, DETAIL_PIXELS] as const;
const QUALITY = 82;
const EFFORT = 6;
const MAX_BYTES = 100_000;
const MIN_SOURCE_PIXELS = 1024;

export async function prepareArtwork(pieceId: string, source: string) {
  const metadata = await sharp(source).metadata();
  if (metadata.width !== metadata.height || (metadata.width ?? 0) < MIN_SOURCE_PIXELS) {
    throw new Error('Use a square source at least 1024 × 1024 pixels; review its framing first.');
  }
  const directory = join('.scratch', 'artwork', pieceId);
  await mkdir(directory, { recursive: true });
  return Promise.all(
    WIDTHS.map(async (width) => {
      const path = join(directory, `${pieceId}-${width}.webp`);
      const result = await sharp(source)
        .rotate()
        .resize(width, width)
        .toColourspace('srgb')
        .webp({ quality: QUALITY, effort: EFFORT })
        .toFile(path);
      if (result.size > MAX_BYTES) throw new Error(`Artwork exceeds 100 KB: ${path}`);
      return { path, width, height: width, bytes: result.size };
    }),
  );
}
