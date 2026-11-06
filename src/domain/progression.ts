import type { GameState } from './gameState';
import { moneyCents, type MoneyCents } from './money';
import { findProperty, type PropertyEconomy } from './properties';
import { estimatedValueCents } from './propertyQuotes';

export type TierThresholds = Readonly<Record<number, MoneyCents>>;

export type ProgressRules = {
  readonly tierUnlocks: TierThresholds;
  readonly properties: PropertyEconomy;
};

type AssetValuation = (state: GameState, rules: ProgressRules) => bigint;

const cash: AssetValuation = (state) => state.cashCents;

const businessCarryingValue: AssetValuation = (state) =>
  state.businesses.reduce<bigint>((total, business) => total + business.capitalizedSpendCents, 0n);

const propertyEstimatedValue: AssetValuation = (state, rules) =>
  state.properties.reduce<bigint>((total, property) => {
    const definition = findProperty(rules.properties.catalog, property.definitionId);
    if (definition === undefined) return total;
    return total + estimatedValueCents(property, { definition, rules: rules.properties.rules });
  }, 0n);

const ASSET_VALUATIONS: readonly AssetValuation[] = [
  cash,
  businessCarryingValue,
  propertyEstimatedValue,
];

function netWorthCents(state: GameState, rules: ProgressRules): MoneyCents {
  return moneyCents(
    ASSET_VALUATIONS.reduce<bigint>((total, value) => total + value(state, rules), 0n),
  );
}

function withPeakNetWorth(state: GameState, rules: ProgressRules): GameState {
  const netWorth = netWorthCents(state, rules);
  return netWorth > state.peakNetWorthCents ? { ...state, peakNetWorthCents: netWorth } : state;
}

function withUnlockedTiers(state: GameState, thresholds: TierThresholds): GameState {
  const reached = Object.entries(thresholds)
    .filter(([, threshold]) => threshold <= state.peakNetWorthCents)
    .map(([tier]) => Number(tier))
    .filter((tier) => !state.unlockedTiers.includes(tier));
  if (reached.length === 0) return state;
  return {
    ...state,
    unlockedTiers: [...state.unlockedTiers, ...reached].toSorted((a, b) => a - b),
  };
}

export function withProgress(state: GameState, rules: ProgressRules): GameState {
  return withUnlockedTiers(withPeakNetWorth(state, rules), rules.tierUnlocks);
}
