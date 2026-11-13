import { z } from 'zod';

import { PRODUCTS } from '@/domain/business/factoryRules';

const positiveInt = z.number().int().positive();
const bps = z.number().int().min(1);
const wholePercent = z.number().int().min(1).max(100);
const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const product = z.object({ priceBps: bps, demandBps: bps, costBps: bps });
const span = <Value extends z.ZodType>(value: Value) => z.object({ min: value, max: value });

export const factoryMechanicSchema = z.object({
  kind: z.literal('factory'),
  unlockStage: positiveInt,
  defaultProduct: z.enum(PRODUCTS),
  retoolDays: positiveInt,
  retoolCapacityBps: bps.max(10_000),
  products: z.object({ standard: product, precision: product, custom: product }),
  bulk: z.object({
    offerDays: positiveInt,
    maxOrders: positiveInt,
    clients: z.array(z.object({ id, name: z.string().min(1) })).min(1),
    sizePercents: z.array(wholePercent).min(1),
    rateBps: span(bps),
    penaltyBps: bps,
    days: span(positiveInt),
  }),
  automation: z.object({
    stage: positiveInt,
    priceMultiple: positiveInt,
    costSavingPercent: wholePercent,
  }),
});

export type FactoryMechanic = z.output<typeof factoryMechanicSchema>;
