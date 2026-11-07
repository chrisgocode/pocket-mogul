import type { BusinessTrack, PriceLevel, StaffRole } from './business/definition';
import type { GameState } from './gameState';
import type { MoneyCents, QuantityMicrounits } from './money';
import type { PropertyTrack } from './propertyQuotes';
import type { SettingsChange } from './settings';
import type { TradeSide } from './tradeQuotes';

export type TapBatch = {
  readonly type: 'TapBatch';
  readonly taps: number;
  readonly boosted?: boolean;
};

export type UpgradeWallet = { readonly type: 'UpgradeWallet'; readonly fromLevel: number };

export type BuyBusiness = { readonly type: 'BuyBusiness'; readonly businessId: string };

export type BuyUnit = {
  readonly type: 'BuyUnit';
  readonly businessId: string;
  readonly fromUnits: number;
};

export type UpgradeBusiness = {
  readonly type: 'UpgradeBusiness';
  readonly businessId: string;
  readonly track: BusinessTrack;
  readonly fromLevel: number;
};

export type SetPriceLevel = {
  readonly type: 'SetPriceLevel';
  readonly businessId: string;
  readonly priceLevel: PriceLevel;
};

export type HireStaff = {
  readonly type: 'HireStaff';
  readonly businessId: string;
  readonly role: StaffRole;
  readonly fromCount: number;
};

export type FireStaff = {
  readonly type: 'FireStaff';
  readonly businessId: string;
  readonly role: StaffRole;
  readonly fromCount: number;
};

export type UpgradeStage = {
  readonly type: 'UpgradeStage';
  readonly businessId: string;
  readonly fromStage: number;
};

export type SetPayout = {
  readonly type: 'SetPayout';
  readonly businessId: string;
  readonly payoutPercent: number;
};

export type DepositToTreasury = {
  readonly type: 'DepositToTreasury';
  readonly businessId: string;
  readonly amountCents: MoneyCents;
};

export type WithdrawFromTreasury = {
  readonly type: 'WithdrawFromTreasury';
  readonly businessId: string;
  readonly amountCents: MoneyCents;
};

export type SellBusiness = { readonly type: 'SellBusiness'; readonly businessId: string };

export type BuyProperty = { readonly type: 'BuyProperty'; readonly propertyId: string };

export type UpgradeProperty = {
  readonly type: 'UpgradeProperty';
  readonly propertyId: string;
  readonly track: PropertyTrack;
  readonly fromLevel: number;
};

export type SetRentalStatus = {
  readonly type: 'SetRentalStatus';
  readonly propertyId: string;
  readonly rented: boolean;
};

export type SellProperty = { readonly type: 'SellProperty'; readonly propertyId: string };

export type ExecuteTrade = {
  readonly type: 'ExecuteTrade';
  readonly assetId: string;
  readonly side: TradeSide;
  readonly quantity: QuantityMicrounits;
  readonly quotedTick: number;
};

export type SetWatchlist = {
  readonly type: 'SetWatchlist';
  readonly assetId: string;
  readonly watched: boolean;
};

export type PinGoal = { readonly type: 'PinGoal'; readonly goalId: string | null };

export type AdvanceTime = { readonly type: 'AdvanceTime' };

export type SettleOffline = { readonly type: 'SettleOffline' };

export type RecordAdReward = { readonly type: 'RecordAdReward'; readonly presentationId: string };

export type ActivateBoost = { readonly type: 'ActivateBoost' };
export type UpdateSettings = { readonly type: 'UpdateSettings'; readonly change: SettingsChange };

export type SkipTutorial = { readonly type: 'SkipTutorial' };

export type AcknowledgeReturnSummary = { readonly type: 'AcknowledgeReturnSummary' };

export type GameCommand =
  | TapBatch
  | UpgradeWallet
  | BuyBusiness
  | BuyUnit
  | UpgradeBusiness
  | SetPriceLevel
  | HireStaff
  | FireStaff
  | UpgradeStage
  | SetPayout
  | DepositToTreasury
  | WithdrawFromTreasury
  | SellBusiness
  | BuyProperty
  | UpgradeProperty
  | SetRentalStatus
  | SellProperty
  | ExecuteTrade
  | SetWatchlist
  | RecordAdReward
  | ActivateBoost
  | PinGoal
  | AdvanceTime
  | SettleOffline
  | AcknowledgeReturnSummary
  | SkipTutorial
  | UpdateSettings;

export type CommandEnvelope = {
  readonly id: string;
  readonly command: GameCommand;
};

export const GAME_ERROR_CODES = [
  'INSUFFICIENT_CASH',
  'INSUFFICIENT_TREASURY',
  'BUSINESS_CLOSED',
  'AT_CAP',
  'ALREADY_OWNED',
  'NOT_OWNED',
  'LOCKED_TIER',
  'UNKNOWN_ASSET',
  'MAX_LEVEL',
  'UPGRADE_UNAVAILABLE',
  'STAGE_LOCKED',
  'STAGE_NOT_READY',
  'INVALID_QUANTITY',
  'INSUFFICIENT_HOLDING',
  'BELOW_MINIMUM',
  'TRADING_LOCKED',
  'STALE_QUOTE',
  'BOOST_ACTIVE',
  'UNKNOWN_GOAL',
  'GOAL_COMPLETED',
  'SAVE_FAILED',
] as const;

export type GameErrorCode = (typeof GAME_ERROR_CODES)[number];

export type CommandResult =
  | { readonly ok: true; readonly state: GameState; readonly cashChangeCents: MoneyCents }
  | { readonly ok: false; readonly error: GameErrorCode };

export type CommandOutcome =
  | { readonly ok: true; readonly revision: number; readonly cashChangeCents: MoneyCents }
  | { readonly ok: false; readonly error: GameErrorCode };
