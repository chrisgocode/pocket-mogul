import { parseArtwork } from './artworkSchema';
import manifest from './collectible-artwork.json';
import { collectibleArtwork } from './collectibleArtwork';
import { getContent } from './index';

const { collection } = getContent();
const ids = collection.pieces.map((piece) => piece.id);
const passIds = collection.sets
  .filter((set) => set.access === 'pass')
  .flatMap((set) => set.pieceIds);

describe('collectible artwork', () => {
  it('has three mobile variants for every collectible across all six categories', () => {
    const pieces = collection.pieces.filter((piece) => !passIds.includes(piece.id));
    expect(new Set(Object.keys(manifest))).toEqual(new Set(pieces.map((piece) => piece.id)));
    expect(new Set(pieces.map((piece) => piece.category)).size).toBe(6);
    expect(pieces.map((piece) => collectibleArtwork(piece.id)?.map((v) => v.width))).toEqual(
      Array.from({ length: 60 }, () => [256, 512, 1024]),
    );
  });

  it('draws the Collector’s pass pieces with the fallback until their artwork is made', () => {
    expect(passIds.map((pieceId) => collectibleArtwork(pieceId))).toEqual(Array(5).fill(undefined));
  });

  it('keeps the fallback available for unregistered artwork', () => {
    expect(parseArtwork({}, ids)).toEqual({});
    expect(collectibleArtwork('unknown')).toBeUndefined();
  });

  it('rejects artwork that points at a nonexistent piece', () => {
    expect(() => parseArtwork({ unknown: manifest.marlow_roadster }, ids)).toThrow(
      'Unknown artwork pieces',
    );
  });

  it('rejects oversized downloads, wrong dimensions and non-public URLs', () => {
    const variants = manifest.marlow_roadster;
    expect(() =>
      parseArtwork(
        { marlow_roadster: [{ ...variants[0], bytes: 100001 }, ...variants.slice(1)] },
        ids,
      ),
    ).toThrow(/Invalid|Too big/);
    expect(() =>
      parseArtwork(
        { marlow_roadster: [{ ...variants[0], width: 1024 }, ...variants.slice(1)] },
        ids,
      ),
    ).toThrow(/Invalid|Too big/);
    expect(() =>
      parseArtwork(
        {
          marlow_roadster: [
            { ...variants[0], uri: 'http://example.com/private' },
            ...variants.slice(1),
          ],
        },
        ids,
      ),
    ).toThrow(/Invalid|Too big/);
  });
});
