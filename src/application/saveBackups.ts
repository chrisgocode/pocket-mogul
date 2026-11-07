import type { SaveBackup, SaveStore } from './ports';
import { decodeSaveIn, type SaveFormat } from './saveFormat';

const BACKUP_INTERVAL_MS = 60_000;

const isDue = (newest: SaveBackup | undefined, wallMs: number) =>
  newest === undefined || Math.abs(wallMs - newest.recordedWallMs) >= BACKUP_INTERVAL_MS;

type Saved = { readonly revision: number; readonly wallMs: number; readonly format: SaveFormat };

const isVerified = (document: string, saved: Saved) => {
  const decoded = decodeSaveIn(saved.format, document);
  return decoded.status === 'current' && decoded.state.revision === saved.revision;
};

export async function backUpIfDue(store: SaveStore, saved: Saved): Promise<void> {
  try {
    await store.transact(async (tx) => {
      const [newest] = await tx.readBackups();
      if (!isDue(newest, saved.wallMs)) return;
      const document = await tx.readSave();
      if (document === undefined || !isVerified(document, saved)) return;
      await tx.writeBackup({ document, recordedWallMs: saved.wallMs });
    });
  } catch {
    return;
  }
}
