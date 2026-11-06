import {
  divideRoundingUp,
  moneyCents,
  priceMicros,
  quantityMicrounits,
  type MoneyCents,
  type PriceMicros,
  type QuantityMicrounits,
} from './money';

export type TradeSide = 'buy' | 'sell';

export type TradePricing = { readonly price: PriceMicros; readonly feeBps: number };

export type TradeOrder = { readonly side: TradeSide; readonly quantity: QuantityMicrounits };

export type TradeQuote = TradeOrder & {
  readonly price: PriceMicros;
  readonly notionalCents: MoneyCents;
  readonly feeCents: MoneyCents;
  readonly cashChangeCents: MoneyCents;
};

const BASIS_POINTS = 10_000n;
const MICROS_TIMES_MICROUNITS_PER_CENT = 10_000_000_000n;

function notionalCents(order: TradeOrder, price: PriceMicros): MoneyCents {
  const product = price * order.quantity;
  return moneyCents(
    order.side === 'buy'
      ? divideRoundingUp(product, MICROS_TIMES_MICROUNITS_PER_CENT)
      : product / MICROS_TIMES_MICROUNITS_PER_CENT,
  );
}

export function quoteTrade(order: TradeOrder, pricing: TradePricing): TradeQuote {
  const notional = notionalCents(order, pricing.price);
  const fee = moneyCents(divideRoundingUp(notional * BigInt(pricing.feeBps), BASIS_POINTS));
  const cashChange = order.side === 'buy' ? 0n - notional - fee : notional - fee;
  return {
    ...order,
    price: pricing.price,
    notionalCents: notional,
    feeCents: fee,
    cashChangeCents: moneyCents(cashChange),
  };
}

export type Position = {
  readonly instrumentId: string;
  readonly quantity: QuantityMicrounits;
  readonly remainingBasisCents: MoneyCents;
  readonly realizedProfitCents: MoneyCents;
};

export type PositionMark = {
  readonly valueCents: MoneyCents;
  readonly unrealizedCents: MoneyCents;
};

export function emptyPosition(instrumentId: string): Position {
  return {
    instrumentId,
    quantity: quantityMicrounits(0),
    remainingBasisCents: moneyCents(0),
    realizedProfitCents: moneyCents(0),
  };
}

function allocatedBasisCents(position: Position, soldQuantity: QuantityMicrounits): bigint {
  if (soldQuantity >= position.quantity) return position.remainingBasisCents;
  return (position.remainingBasisCents * soldQuantity) / position.quantity;
}

export function settleTrade(position: Position, quote: TradeQuote): Position {
  if (quote.side === 'buy') {
    return {
      ...position,
      quantity: quantityMicrounits(position.quantity + quote.quantity),
      remainingBasisCents: moneyCents(position.remainingBasisCents - quote.cashChangeCents),
    };
  }
  const allocated = allocatedBasisCents(position, quote.quantity);
  return {
    ...position,
    quantity: quantityMicrounits(position.quantity - quote.quantity),
    remainingBasisCents: moneyCents(position.remainingBasisCents - allocated),
    realizedProfitCents: moneyCents(
      position.realizedProfitCents + quote.cashChangeCents - allocated,
    ),
  };
}

export function markPosition(position: Position, price: PriceMicros): PositionMark {
  const valueCents = notionalCents({ side: 'sell', quantity: position.quantity }, price);
  return { valueCents, unrealizedCents: moneyCents(valueCents - position.remainingBasisCents) };
}

export type CashBudget =
  | { readonly side: 'buy'; readonly cashCents: MoneyCents }
  | { readonly side: 'sell'; readonly cashCents: MoneyCents; readonly holding: QuantityMicrounits };

function cashMoved(quote: TradeQuote): bigint {
  return quote.side === 'buy' ? 0n - quote.cashChangeCents : quote.cashChangeCents;
}

function upperQuantity(budget: CashBudget, price: PriceMicros): bigint {
  if (budget.side === 'sell') return budget.holding;
  return (budget.cashCents * MICROS_TIMES_MICROUNITS_PER_CENT) / price + 1n;
}

export function largestQuantityWithin(
  budget: CashBudget,
  pricing: TradePricing,
): QuantityMicrounits {
  const fits = (quantity: bigint) =>
    cashMoved(quoteTrade({ side: budget.side, quantity: quantityMicrounits(quantity) }, pricing)) <=
    budget.cashCents;
  let low = 0n;
  let high = upperQuantity(budget, pricing.price);
  while (low < high) {
    const middle = (low + high + 1n) / 2n;
    if (fits(middle)) low = middle;
    else high = middle - 1n;
  }
  return quantityMicrounits(low);
}

export function averageCost(position: Position): PriceMicros | undefined {
  if (position.quantity === 0n) return undefined;
  return priceMicros(
    (position.remainingBasisCents * MICROS_TIMES_MICROUNITS_PER_CENT) / position.quantity,
  );
}
