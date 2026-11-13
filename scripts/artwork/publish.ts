import { readFile, rename, writeFile } from 'node:fs/promises';

import { parseArtwork } from '@/content/artworkSchema';
import { getContent } from '@/content';

import { prepareArtwork } from './prepare';
import { uploadArtwork } from './upload';

const ARGUMENT_OFFSET = 2;
const JSON_INDENT = 2;

async function publish() {
  const [pieceId, source] = process.argv.slice(ARGUMENT_OFFSET);
  const ids = getContent().collection.pieces.map((piece) => piece.id);
  if (pieceId === undefined || source === undefined || !ids.includes(pieceId)) {
    throw new Error('Usage: bun run artwork:publish <existing-piece-id> <square-master.png>');
  }
  if (process.env['UPLOADTHING_TOKEN'] === undefined || process.env['UPLOADTHING_TOKEN'] === '')
    throw new Error('Set UPLOADTHING_TOKEN in the shell');
  const manifestPath = 'src/content/collectible-artwork.json';
  const manifest = parseArtwork(JSON.parse(await readFile(manifestPath, 'utf8')), ids);
  const prepared = await prepareArtwork(pieceId, source);
  const variants = await uploadArtwork(prepared);
  const updated = parseArtwork({ ...manifest, [pieceId]: variants }, ids);
  const temporary = `${manifestPath}.pending`;
  await writeFile(temporary, `${JSON.stringify(updated, null, JSON_INDENT)}\n`);
  await rename(temporary, manifestPath);
  process.stdout.write(`${pieceId}: published and verified three mobile variants`);
}

await publish();
