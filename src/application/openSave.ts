import { freshGameState, type GameState } from '@/domain/gameState';

import type { SaveStore, SaveTransaction } from './ports';
import { decodeSave, type DecodedSave } from './saveFormat';

export type SaveNotice = { readonly kind: 'none' } | { readonly kind: 'restoredFromBackup' };

export type SaveStopReason = 'UNSUPPORTED_SAVE_VERSION' | 'DAMAGED_SAVE';

export type OpenedSave =
  | { readonly status: 'ready'; readonly state: GameState; readonly notice: SaveNotice }
  | { readonly status: 'stopped'; readonly reason: SaveStopReason };

export type SaveOpening = {
  readonly store: SaveStore;
  readonly wallMs: number;
  readonly createId: () => string;
  readonly currentEconomyVersion: number;
  readonly supportsEconomy: (economyVersion: number) => boolean;
};

type Readable = Extract<DecodedSave, { state: GameState }>;

const MS_PER_DAY = 86_400_000;
const RECEIPT_RETENTION_DAYS = 30;
const RECEIPT_RETENTION_MS = RECEIPT_RETENTION_DAYS * MS_PER_DAY;

const NO_NOTICE: SaveNotice = { kind: 'none' };

function isReadable(decoded: DecodedSave): decoded is Readable {
  return decoded.status === 'current' || decoded.status === 'migrated';
}

async function startFresh(tx: SaveTransaction, opening: SaveOpening): Promise<OpenedSave> {
  const state = freshGameState({
    saveId: opening.createId(),
    economyVersion: opening.currentEconomyVersion,
    wallMs: opening.wallMs,
  });
  await tx.writeState(state);
  return { status: 'ready', state, notice: NO_NOTICE };
}

async function restoreFromBackup(
  tx: SaveTransaction,
  damaged: { document: string; opening: SaveOpening },
): Promise<OpenedSave> {
  const backups = await tx.readBackups();
  const restorable = backups
    .map((backup) => decodeSave(backup.document))
    .filter(isReadable)
    .find((decoded) => damaged.opening.supportsEconomy(decoded.state.economyVersion));
  if (restorable === undefined) return { status: 'stopped', reason: 'DAMAGED_SAVE' };
  await tx.writeDiagnostic({
    type: 'DAMAGED_SAVE',
    document: damaged.document,
    recordedWallMs: damaged.opening.wallMs,
  });
  await tx.writeState(restorable.state);
  return { status: 'ready', state: restorable.state, notice: { kind: 'restoredFromBackup' } };
}

async function openReadable(
  tx: SaveTransaction,
  readable: { decoded: Readable; document: string; opening: SaveOpening },
): Promise<OpenedSave> {
  const { decoded, document, opening } = readable;
  if (!opening.supportsEconomy(decoded.state.economyVersion)) {
    return { status: 'stopped', reason: 'UNSUPPORTED_SAVE_VERSION' };
  }
  if (decoded.status === 'migrated') {
    await tx.writeBackup({ document, recordedWallMs: opening.wallMs });
    await tx.writeState(decoded.state);
  }
  return { status: 'ready', state: decoded.state, notice: NO_NOTICE };
}

async function openDocument(
  tx: SaveTransaction,
  saved: { document: string; opening: SaveOpening },
): Promise<OpenedSave> {
  const decoded = decodeSave(saved.document);
  if (decoded.status === 'newer') return { status: 'stopped', reason: 'UNSUPPORTED_SAVE_VERSION' };
  if (decoded.status === 'corrupt') return restoreFromBackup(tx, saved);
  return openReadable(tx, { ...saved, decoded });
}

export function openSave(opening: SaveOpening): Promise<OpenedSave> {
  return opening.store.transact(async (tx) => {
    const document = await tx.readSave();
    const opened =
      document === undefined
        ? await startFresh(tx, opening)
        : await openDocument(tx, { document, opening });
    if (opened.status === 'ready') await tx.pruneReceipts(opening.wallMs - RECEIPT_RETENTION_MS);
    return opened;
  });
}
