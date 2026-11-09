import type { PurchaseRecord } from './purchaseLedger';
import type { ActivityEntry } from '@/domain/activity';
import type { CommandOutcome } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import type { HourlyCandle, MarketHistory, MinuteObservation } from '@/domain/market';
import type { WallClockReading } from '@/domain/offline';

export type CancelTimer = () => void;

export type Clock = {
  monotonicMs: () => number;
  wallMs: () => number;
  localDayKey: (wallMs: number) => string;
  schedule: (delayMs: number, task: () => void) => CancelTimer;
};

type BackwardWallClock = Omit<Extract<WallClockReading, { direction: 'backward' }>, 'direction'>;

export type Diagnostic =
  | (BackwardWallClock & { readonly type: 'BACKWARD_WALL_CLOCK'; readonly recordedWallMs: number })
  | {
      readonly type: 'DAMAGED_SAVE' | 'PRE_BASELINE_SAVE' | 'RETIRED_FORMAT_SAVE';
      readonly document: string;
      readonly recordedWallMs: number;
    };

export type AssetHistory = {
  readonly minutes: readonly MinuteObservation[];
  readonly hours: readonly HourlyCandle[];
};

export type SaveStore = {
  loadAssetHistory: (assetId: string) => Promise<AssetHistory>;
  loadDiagnostics: () => Promise<readonly Diagnostic[]>;
  loadActivity: () => Promise<readonly ActivityEntry[]>;
  transact<T>(work: (tx: SaveTransaction) => Promise<T>): Promise<T>;
};

export type CommandReceipt = {
  readonly commandId: string;
  readonly outcome: CommandOutcome;
  readonly recordedWallMs: number;
};

export type SaveBackup = { readonly document: string; readonly recordedWallMs: number };

export type SaveTransaction = {
  readPurchases: () => Promise<readonly PurchaseRecord[]>;
  writePurchase: (record: PurchaseRecord) => Promise<void>;
  readSave: () => Promise<string | undefined>;
  readBackups: () => Promise<readonly SaveBackup[]>;
  writeBackup: (backup: SaveBackup) => Promise<void>;
  clearBackups: () => Promise<void>;
  clearMarketHistory: () => Promise<void>;
  clearActivity: () => Promise<void>;
  appendActivity: (entries: readonly ActivityEntry[]) => Promise<void>;
  pruneReceipts: (recordedBeforeWallMs: number) => Promise<void>;
  findOutcome: (commandId: string) => Promise<CommandOutcome | undefined>;
  writeState: (state: GameState) => Promise<void>;
  writeReceipt: (receipt: CommandReceipt) => Promise<void>;
  writeDiagnostic: (diagnostic: Diagnostic) => Promise<void>;
  appendMarketHistory: (history: MarketHistory) => Promise<void>;
};

export type AdAvailability = 'loading' | 'ready' | 'unavailable';

export type FullScreenAdEvent =
  | { readonly type: 'availability'; readonly availability: AdAvailability }
  | { readonly type: 'earnedReward' }
  | { readonly type: 'clicked' }
  | { readonly type: 'closed' }
  | { readonly type: 'failed' };

export type FullScreenAd = {
  load: () => void;
  show: () => Promise<void>;
  subscribe: (listener: (event: FullScreenAdEvent) => void) => () => void;
};

export type AdPort = {
  readonly rewarded: FullScreenAd;
  readonly interstitial: FullScreenAd;
  readonly appOpen: FullScreenAd;
};
