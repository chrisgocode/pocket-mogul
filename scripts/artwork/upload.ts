import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { UTApi, UTFile } from 'uploadthing/server';

type PreparedVariant = { path: string; width: number; height: number; bytes: number };

export async function uploadArtwork(variants: readonly PreparedVariant[]) {
  const files = await Promise.all(
    variants.map(
      async ({ path }) =>
        new UTFile([await readFile(path)], basename(path), { type: 'image/webp' }),
    ),
  );
  const results = await new UTApi().uploadFiles(files, { acl: 'public-read' });
  return Promise.all(
    results.map(async (result, index) => {
      if (result.error !== null) throw new Error(result.error.message);
      const variant = variants[index];
      if (variant === undefined) throw new Error('Upload has no corresponding image');
      const uri = result.data.ufsUrl;
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Image verification HTTP ${response.status}`);
      const remote = Buffer.from(await response.arrayBuffer());
      if (!remote.equals(await readFile(variant.path))) throw new Error('Uploaded bytes differ');
      return { uri, width: variant.width, height: variant.height, bytes: variant.bytes };
    }),
  );
}
