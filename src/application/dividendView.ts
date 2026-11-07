import type { Content, Stock } from '@/content';
import { dividendPerHourCents, msUntilDividendPayout } from '@/domain/dividends';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { stateWithUnsavedIncome } from './cashView';
import type { GameSnapshot } from './game';

export type DividendView = {
  readonly holdingPerHourCents: MoneyCents | undefined;
  readonly pendingCents: MoneyCents;
  readonly nextPayoutInMs: number;
};

function holdingPerHourCents(state: GameState, stock: Stock): MoneyCents | undefined {
  const position = state.positions.find((held) => held.instrumentId === stock.id);
  if (position === undefined || position.quantity === 0n) return undefined;
  return dividendPerHourCents(position.quantity, stock.dividendCentsPerSharePerHour);
}

export function selectDividends(
  snapshot: GameSnapshot,
  request: { assetId: string; content: Content },
): DividendView | undefined {
  const stock = request.content.stocks.find((listed) => listed.id === request.assetId);
  if (stock === undefined || stock.dividendCentsPerSharePerHour === 0n) return undefined;
  const state = stateWithUnsavedIncome(snapshot, request.content);
  const perHour = holdingPerHourCents(state, stock);
  const accrual = state.dividendAccruals.find((pending) => pending.instrumentId === stock.id);
  if (perHour === undefined && accrual === undefined) return undefined;
  return {
    holdingPerHourCents: perHour,
    pendingCents: accrual?.pendingCents ?? moneyCents(0),
    nextPayoutInMs: msUntilDividendPayout(state.clock.simulationMs),
  };
}
