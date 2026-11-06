import type { GameState } from './gameState';
import { moneyCents, type MoneyCents } from './money';
import { findProperty, type PropertyEconomy } from './properties';
import { quoteOf } from './market';
import type { MarketInstrument } from './marketRules';
import { estimatedValueCents } from './propertyQuotes';
import { markPosition } from './trading';

export type TierThresholds = Readonly<Record<number, MoneyCents>>;

export type ProgressRules = {
  readonly tierUnlocks: TierThresholds;
  readonly properties: PropertyEconomy;
  readonly instruments: readonly MarketInstrument[];
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

const positionMarkedValue: AssetValuation = (state, rules) =>
  state.positions.reduce<bigint>((total, position) => {
    const instrument = rules.instruments.find((listed) => listed.id === position.instrumentId);
    if (instrument === undefined) return total;
    return total + markPosition(position, quoteOf(state.market, instrument)).valueCents;
  }, 0n);

const ASSET_VALUATIONS: readonly AssetValuation[] = [
  cash,
  businessCarryingValue,
  propertyEstimatedValue,
  positionMarkedValue,
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

function insertInOrder(tiers: readonly number[], tier: number): readonly number[] {
  const index = tiers.findIndex((existing) => existing > tier);
  return index === -1 ? [...tiers, tier] : [...tiers.slice(0, index), tier, ...tiers.slice(index)];
}

function withUnlockedTiers(state: GameState, thresholds: TierThresholds): GameState {
  const reached = Object.entries(thresholds)
    .filter(([, threshold]) => threshold <= state.peakNetWorthCents)
    .map(([tier]) => Number(tier))
    .filter((tier) => !state.unlockedTiers.includes(tier));
  if (reached.length === 0) return state;
  return {
    ...state,
    unlockedTiers: reached.reduce(insertInOrder, state.unlockedTiers),
  };
}

export function withProgress(state: GameState, rules: ProgressRules): GameState {
  return withUnlockedTiers(withPeakNetWorth(state, rules), rules.tierUnlocks);
}
