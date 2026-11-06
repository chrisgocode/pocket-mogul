import type { Content } from '@/content';
import type { GameState } from '@/domain/gameState';
import { quoteOf } from '@/domain/market';
import {
  priceMicros,
  type MoneyCents,
  type PriceMicros,
  type QuantityMicrounits,
} from '@/domain/money';
import { markPosition } from '@/domain/trading';
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

const MICROS_TIMES_MICROUNITS_PER_CENT = 10_000_000_000n;

export function selectPosition(
  state: GameState,
  request: { assetId: string; content: Content },
): PositionView | undefined {
  const position = state.positions.find((held) => held.instrumentId === request.assetId);
  const instrument = findInstrument(tradeEconomy(request.content), request.assetId);
  if (position === undefined || instrument === undefined) return undefined;
  const mark = markPosition(position, quoteOf(state.market, instrument));
  const averageCost =
    position.quantity === 0n
      ? undefined
      : priceMicros(
          (position.remainingBasisCents * MICROS_TIMES_MICROUNITS_PER_CENT) / position.quantity,
        );
  return {
    quantity: position.quantity,
    averageCost,
    basisCents: position.remainingBasisCents,
    valueCents: mark.valueCents,
    unrealizedCents: mark.unrealizedCents,
    realizedProfitCents: position.realizedProfitCents,
  };
}
