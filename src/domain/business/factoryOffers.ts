import { drawInt } from '@/domain/marketRandom';

import type { BulkOffer, FactoryRules } from './factoryRules';

export type BulkOfferDraw = {
  readonly seed: string;
  readonly businessId: string;
  readonly rules: FactoryRules;
};

const BULK_STREAM = 'bulk';
const RATE_STEP_BPS = 500;

export function bulkOfferOn(draw: BulkOfferDraw, day: number): BulkOffer {
  const { bulk } = draw.rules;
  const id = Math.floor(day / bulk.offerDays);
  const roll = (part: string, max: number) =>
    drawInt(
      { seed: draw.seed, tick: id, scope: `${draw.businessId}:${part}`, stream: BULK_STREAM },
      [0, max],
    );
  const rateSteps = Math.floor((bulk.rateBps.max - bulk.rateBps.min) / RATE_STEP_BPS);
  const client = bulk.clients[roll('client', bulk.clients.length - 1)];
  const size = bulk.sizePercents[roll('size', bulk.sizePercents.length - 1)];
  return {
    id,
    clientId: client?.id ?? '',
    sizePercent: size ?? 0,
    rateBps: bulk.rateBps.min + roll('rate', rateSteps) * RATE_STEP_BPS,
    days: bulk.days.min + roll('days', bulk.days.max - bulk.days.min),
  };
}
