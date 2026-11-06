import { drawInt, type InclusiveRange } from './marketRandom';
import type { MarketRules } from './marketRules';

export type Regime = 'bear' | 'neutral' | 'bull';

const LAST_PERCENT = 99;

export const PERCENT_DRAW: InclusiveRange = [0, LAST_PERCENT];

const REGIME_SIGN: Record<Regime, number> = { bear: -1, neutral: 0, bull: 1 };

export function windowStart(tick: number, everyTicks: number): number {
  return Math.floor(tick / everyTicks) * everyTicks;
}

export function regimeAt(seed: string, at: { tick: number; rules: MarketRules }): Regime {
  const { regimeEveryTicks, regimeChancePercent } = at.rules;
  const tick = windowStart(at.tick, regimeEveryTicks);
  const roll = drawInt({ seed, tick, scope: 'market', stream: 'regime' }, PERCENT_DRAW);
  if (roll < regimeChancePercent.bear) return 'bear';
  return roll < regimeChancePercent.bear + regimeChancePercent.neutral ? 'neutral' : 'bull';
}

export function regimeSign(regime: Regime): number {
  return REGIME_SIGN[regime];
}
