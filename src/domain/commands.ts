import type { UpgradeTrack } from './businessQuotes';
import type { GameState } from './gameState';
import type { MoneyCents } from './money';

export type TapBatch = { readonly type: 'TapBatch'; readonly taps: number };

export type UpgradeWallet = { readonly type: 'UpgradeWallet'; readonly fromLevel: number };

export type BuyBusiness = { readonly type: 'BuyBusiness'; readonly businessId: string };

export type UpgradeBusiness = {
  readonly type: 'UpgradeBusiness';
  readonly businessId: string;
  readonly track: UpgradeTrack;
  readonly fromLevel: number;
};

export type HireManager = { readonly type: 'HireManager'; readonly businessId: string };

export type SellBusiness = { readonly type: 'SellBusiness'; readonly businessId: string };

export type AdvanceTime = { readonly type: 'AdvanceTime' };

export type GameCommand =
  | TapBatch
  | UpgradeWallet
  | BuyBusiness
  | UpgradeBusiness
  | HireManager
  | SellBusiness
  | AdvanceTime;

export type CommandEnvelope = {
  readonly id: string;
  readonly command: GameCommand;
};

export const GAME_ERROR_CODES = [
  'INSUFFICIENT_CASH',
  'ALREADY_OWNED',
  'NOT_OWNED',
  'LOCKED_TIER',
  'UNKNOWN_ASSET',
  'MAX_LEVEL',
  'INVALID_QUANTITY',
  'STALE_QUOTE',
  'SAVE_FAILED',
] as const;

export type GameErrorCode = (typeof GAME_ERROR_CODES)[number];

export type CommandResult =
  | { readonly ok: true; readonly state: GameState; readonly cashChangeCents: MoneyCents }
  | { readonly ok: false; readonly error: GameErrorCode };

export type CommandOutcome =
  | { readonly ok: true; readonly revision: number; readonly cashChangeCents: MoneyCents }
  | { readonly ok: false; readonly error: GameErrorCode };
