import type { CommandOutcome } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import type { HourlyCandle, MarketHistory, MinuteObservation } from '@/domain/market';
import type { WallClockReading } from '@/domain/offline';

export type CancelTimer = () => void;

export type Clock = {
  monotonicMs: () => number;
  wallMs: () => number;
  schedule: (delayMs: number, task: () => void) => CancelTimer;
};

type BackwardWallClock = Omit<Extract<WallClockReading, { direction: 'backward' }>, 'direction'>;

export type Diagnostic = BackwardWallClock & {
  readonly type: 'BACKWARD_WALL_CLOCK';
  readonly recordedWallMs: number;
};

export type AssetHistory = {
  readonly minutes: readonly MinuteObservation[];
  readonly hours: readonly HourlyCandle[];
};

export type SaveStore = {
  load: () => Promise<GameState | undefined>;
  loadAssetHistory: (assetId: string) => Promise<AssetHistory>;
  loadDiagnostics: () => Promise<readonly Diagnostic[]>;
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
  writeDiagnostic: (diagnostic: Diagnostic) => Promise<void>;
  appendMarketHistory: (history: MarketHistory) => Promise<void>;
};
