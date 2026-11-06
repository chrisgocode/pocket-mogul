import { moneyCents, type MoneyCents } from './money';

export const SAVE_SCHEMA_VERSION = 1;

export type OwnedBusiness = {
  readonly definitionId: string;
  readonly capitalizedSpendCents: MoneyCents;
};
export type OwnedProperty = { readonly definitionId: string };

export type IncomeState = {
  readonly businessRemainders: Readonly<Record<string, number>>;
  readonly businessEarningsCents: MoneyCents;
};

export type GameState = {
  readonly saveId: string;
  readonly schemaVersion: number;
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
};

export function freshGameState(start: {
  saveId: string;
  economyVersion: number;
  wallMs: number;
}): GameState {
  return {
    saveId: start.saveId,
    schemaVersion: SAVE_SCHEMA_VERSION,
    economyVersion: start.economyVersion,
    revision: 0,
    cashCents: moneyCents(0),
    peakNetWorthCents: moneyCents(0),
    lifetimeTapEarningsCents: moneyCents(0),
    clock: { simulationMs: 0, lastWallCheckpointMs: start.wallMs },
    tap: { walletLevel: 0, totalAcceptedTaps: 0 },
    businesses: [],
    properties: [],
    income: { businessRemainders: {}, businessEarningsCents: moneyCents(0) },
    unlockedTiers: [1],
  };
}
