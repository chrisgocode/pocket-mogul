import type { CommandOutcome } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

export type CancelTimer = () => void;

export type Clock = {
  monotonicMs: () => number;
  wallMs: () => number;
  schedule: (delayMs: number, task: () => void) => CancelTimer;
};

export type SaveStore = {
  load: () => Promise<GameState | undefined>;
  transact<T>(work: (tx: SaveTransaction) => Promise<T>): Promise<T>;
};

export type CommandReceipt = {
  readonly commandId: string;
  readonly outcome: CommandOutcome;
  readonly recordedWallMs: number;
};

export type SaveTransaction = {
  findOutcome: (commandId: string) => Promise<CommandOutcome | undefined>;
  writeState: (state: GameState) => Promise<void>;
  writeReceipt: (receipt: CommandReceipt) => Promise<void>;
};
