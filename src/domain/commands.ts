import type { BusinessTrack, IncidentCategory, PriceLevel, StaffRole } from './business/definition';
import type { OptionalPackage } from './business/carWashRules';
import type { RestockTarget } from './business/vendingCommands';
import type { StockMix, VendingLocation } from './business/vendingRules';
import type { CoachMark } from './coachMarks';
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

export type SetInsurance = {
  readonly type: 'SetInsurance';
  readonly businessId: string;
  readonly category: IncidentCategory;
  readonly insured: boolean;
};

export type MoveVendingMachine = {
  readonly type: 'MoveVendingMachine';
  readonly businessId: string;
  readonly from: VendingLocation;
  readonly to: VendingLocation;
};

export type SetVendingMix = {
  readonly type: 'SetVendingMix';
  readonly businessId: string;
  readonly location: VendingLocation;
  readonly mix: StockMix;
};

export type RestockVending = {
  readonly type: 'RestockVending';
  readonly businessId: string;
  readonly location: RestockTarget;
};

export type InstallCardReaders = {
  readonly type: 'InstallCardReaders';
  readonly businessId: string;
};

export type SetWashPackage = {
  readonly type: 'SetWashPackage';
  readonly businessId: string;
  readonly washPackage: OptionalPackage;
  readonly offered: boolean;
};

export type SetMembershipPrice = {
  readonly type: 'SetMembershipPrice';
  readonly businessId: string;
  readonly priceLevel: PriceLevel;
};

export type SetMemberCap = {
  readonly type: 'SetMemberCap';
  readonly businessId: string;
  readonly capPercent: number;
};

export type InstallDetailing = {
  readonly type: 'InstallDetailing';
  readonly businessId: string;
};

export type AcceptContract = {
  readonly type: 'AcceptContract';
  readonly businessId: string;
  readonly offerId: string;
};

export type DeclineContract = {
  readonly type: 'DeclineContract';
  readonly businessId: string;
  readonly offerId: string;
};

export type InstallSortingHub = {
  readonly type: 'InstallSortingHub';
  readonly businessId: string;
};

export type MakeTakeoverOffer = {
  readonly type: 'MakeTakeoverOffer';
  readonly businessId: string;
  readonly rivalId: string;
  readonly amountCents: MoneyCents;
};

export type DismissCoachMark = { readonly type: 'DismissCoachMark'; readonly coachMark: CoachMark };

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

export type GoPublic = {
  readonly type: 'GoPublic';
  readonly businessId: string;
  readonly floatPercent: number;
  readonly ticker: string;
};

export type GameCommand =
  | GoPublic
  | TapBatch
  | UpgradeWallet
  | BuyBusiness
  | BuyUnit
  | UpgradeBusiness
  | SetPriceLevel
  | HireStaff
  | FireStaff
  | UpgradeStage
  | SetInsurance
  | MoveVendingMachine
  | SetVendingMix
  | RestockVending
  | InstallCardReaders
  | SetWashPackage
  | SetMembershipPrice
  | SetMemberCap
  | InstallDetailing
  | AcceptContract
  | DeclineContract
  | InstallSortingHub
  | MakeTakeoverOffer
  | DismissCoachMark
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
  'OFFER_PENDING',
  'OFFER_LOCKED',
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
