import type { Content } from '@/content';
import type { GameState } from '@/domain/gameState';
import { quoteOf } from '@/domain/market';
import type { MoneyCents, PriceMicros, QuantityMicrounits } from '@/domain/money';
import { averageCost, markPosition } from '@/domain/tradeQuotes';
import { findInstrument } from '@/domain/trades';

import { tradeEconomy } from './economy';

export type PositionView = {
  readonly quantity: QuantityMicrounits;
  readonly averageCost: PriceMicros | undefined;
  readonly basisCents: MoneyCents;
  readonly valueCents: MoneyCents;
  readonly unrealizedCents: MoneyCents;
  readonly realizedProfitCents: MoneyCents;
};

export function selectPosition(
  state: GameState,
  request: { assetId: string; content: Content },
): PositionView | undefined {
  const position = state.positions.find((held) => held.instrumentId === request.assetId);
  const instrument = findInstrument(tradeEconomy(request.content, state), request.assetId);
  if (position === undefined || instrument === undefined) return undefined;
  const mark = markPosition(position, quoteOf(state.market, instrument));
  return {
    quantity: position.quantity,
    averageCost: averageCost(position),
    basisCents: position.remainingBasisCents,
    valueCents: mark.valueCents,
    unrealizedCents: mark.unrealizedCents,
    realizedProfitCents: position.realizedProfitCents,
  };
}
