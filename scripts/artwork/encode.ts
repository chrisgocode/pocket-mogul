import sharp from 'sharp';

const INITIAL_QUALITY = 82;
const MIN_QUALITY = 18;
const QUALITY_STEP = 4;
const EFFORT = 6;
const MAX_BYTES = 100_000;

async function encodeAtQuality(source: string, width: number, quality: number): Promise<Buffer> {
  const buffer = await sharp(source)
    .rotate()
    .resize(width, width)
    .toColourspace('srgb')
    .webp({ quality, effort: EFFORT })
    .toBuffer();
  if (buffer.byteLength <= MAX_BYTES) return buffer;
  if (quality <= MIN_QUALITY) {
    throw new Error(`Artwork exceeds 100 KB at ${width} pixels; simplify the source.`);
  }
  return encodeAtQuality(source, width, quality - QUALITY_STEP);
}

export function encodeArtwork(source: string, width: number) {
  return encodeAtQuality(source, width, INITIAL_QUALITY);
}
