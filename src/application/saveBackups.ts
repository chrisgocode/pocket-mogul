import type { SaveBackup, SaveStore } from './ports';
import { decodeSave } from './saveFormat';

const BACKUP_INTERVAL_MS = 60_000;

const isDue = (newest: SaveBackup | undefined, wallMs: number) =>
  newest === undefined || Math.abs(wallMs - newest.recordedWallMs) >= BACKUP_INTERVAL_MS;

const isVerified = (document: string, revision: number) => {
  const decoded = decodeSave(document);
  return decoded.status === 'current' && decoded.state.revision === revision;
};

export async function backUpIfDue(
  store: SaveStore,
  saved: { revision: number; wallMs: number },
): Promise<void> {
  try {
    await store.transact(async (tx) => {
      const [newest] = await tx.readBackups();
      if (!isDue(newest, saved.wallMs)) return;
      const document = await tx.readSave();
      if (document === undefined || !isVerified(document, saved.revision)) return;
      await tx.writeBackup({ document, recordedWallMs: saved.wallMs });
    });
  } catch {
    return;
  }
}
