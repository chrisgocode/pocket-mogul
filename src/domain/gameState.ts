import { freshAdSchedule, type AdScheduleState } from './adSchedule';
import { EMPTY_ACTIVITY, type ActivityLog } from './activity';
import { NO_REWARDS, type RewardState } from './boost';
import type { OwnedBusiness } from './business/owned';
import type { DividendAccrual } from './dividends';
import { NO_GOAL_PROGRESS, type GoalProgress } from './goals';
import { freshMarket, type MarketState } from './market';
import { moneyCents, type MoneyCents } from './money';
import type { Position } from './tradeQuotes';
import { defaultSettings, type Settings } from './settings';
import { freshTutorial, type TutorialProgress } from './tutorial';

export type { OwnedBusiness } from './business/owned';

export const SAVE_SCHEMA_VERSION = 2;

const SAVE_MIN_READER_VERSION = 2;

export type PropertyLevels = {
  readonly renovation: number;
  readonly furnishings: number;
  readonly systems: number;
  readonly expansion: number;
};

export type OwnedProperty = {
  readonly definitionId: string;
  readonly levels: PropertyLevels;
  readonly rented: boolean;
  readonly upgradeSpendCents: MoneyCents;
};

export type IncomeState = {
  readonly businessEarningsCents: MoneyCents;
  readonly rentRemainders: Readonly<Record<string, number>>;
  readonly rentEarningsCents: MoneyCents;
  readonly dividendEarningsCents: MoneyCents;
};

export type IncomeBySource = {
  readonly businesses: MoneyCents;
  readonly rent: MoneyCents;
  readonly dividends: MoneyCents;
};

export type ReturnSummary = {
  readonly awayMs: number;
  readonly creditedMs: number;
  readonly earnings: IncomeBySource;
  readonly closures: readonly string[];
};

export type PendingReturnSummary =
  | { readonly status: 'none' }
  | { readonly status: 'pending'; readonly summary: ReturnSummary };

export type GameState = {
  readonly saveId: string;
  readonly schemaVersion: number;
  readonly minReaderVersion: number;
  readonly economyVersion: number;
  readonly revision: number;
  readonly cashCents: MoneyCents;
  readonly peakNetWorthCents: MoneyCents;
  readonly lifetimeTapEarningsCents: MoneyCents;
  readonly clock: { readonly simulationMs: number; readonly lastWallCheckpointMs: number };
  readonly tap: { readonly walletLevel: number; readonly totalAcceptedTaps: number };
  readonly businesses: readonly OwnedBusiness[];
  readonly properties: readonly OwnedProperty[];
  readonly income: IncomeState;
  readonly unlockedTiers: readonly number[];
  readonly returnSummary: PendingReturnSummary;
  readonly market: MarketState;
  readonly tradingUnlocked: boolean;
  readonly positions: readonly Position[];
  readonly dividendAccruals: readonly DividendAccrual[];
  readonly watchlist: readonly string[];
  readonly reward: RewardState;
  readonly goals: GoalProgress;
  readonly activity: ActivityLog;
  readonly tutorial: TutorialProgress;
  readonly settings: Settings;
  readonly adSchedule: AdScheduleState;
};

export function freshGameState(start: {
  saveId: string;
  economyVersion: number;
  wallMs: number;
}): GameState {
  return {
    saveId: start.saveId,
    schemaVersion: SAVE_SCHEMA_VERSION,
    minReaderVersion: SAVE_MIN_READER_VERSION,
    economyVersion: start.economyVersion,
    revision: 0,
    cashCents: moneyCents(0),
    peakNetWorthCents: moneyCents(0),
    lifetimeTapEarningsCents: moneyCents(0),
    clock: { simulationMs: 0, lastWallCheckpointMs: start.wallMs },
    tap: { walletLevel: 0, totalAcceptedTaps: 0 },
    businesses: [],
    properties: [],
    income: {
      businessEarningsCents: moneyCents(0),
      rentRemainders: {},
      rentEarningsCents: moneyCents(0),
      dividendEarningsCents: moneyCents(0),
    },
    unlockedTiers: [1],
    returnSummary: { status: 'none' },
    market: freshMarket(start.saveId),
    tradingUnlocked: false,
    positions: [],
    dividendAccruals: [],
    watchlist: [],
    reward: NO_REWARDS,
    goals: NO_GOAL_PROGRESS,
    activity: EMPTY_ACTIVITY,
    tutorial: freshTutorial(),
    settings: defaultSettings(),
    adSchedule: freshAdSchedule(),
  };
}
