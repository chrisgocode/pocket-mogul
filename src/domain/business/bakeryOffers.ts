import { drawInt } from '@/domain/marketRandom';

import type { BakeryRules, WholesaleOffer } from './bakeryRules';

export type OfferDraw = {
  readonly seed: string;
  readonly businessId: string;
  readonly rules: BakeryRules;
};

const WHOLESALE_STREAM = 'wholesale';
const PRICE_STEP_BPS = 500;

function offerPeriod(rules: BakeryRules, day: number): number {
  return Math.floor(day / rules.wholesale.offerDays);
}

export function wholesaleOfferOn(draw: OfferDraw, day: number): WholesaleOffer {
  const { wholesale } = draw.rules;
  const id = offerPeriod(draw.rules, day);
  const roll = (part: string, max: number) =>
    drawInt(
      { seed: draw.seed, tick: id, scope: `${draw.businessId}:${part}`, stream: WHOLESALE_STREAM },
      [0, max],
    );
  const priceSteps = Math.floor((wholesale.priceBps.max - wholesale.priceBps.min) / PRICE_STEP_BPS);
  const client = wholesale.clients[roll('client', wholesale.clients.length - 1)];
  const size = wholesale.sizePercents[roll('size', wholesale.sizePercents.length - 1)];
  return {
    id,
    clientId: client?.id ?? '',
    sizePercent: size ?? 0,
    priceBps: wholesale.priceBps.min + roll('price', priceSteps) * PRICE_STEP_BPS,
    days: wholesale.days.min + roll('days', wholesale.days.max - wholesale.days.min),
  };
}
