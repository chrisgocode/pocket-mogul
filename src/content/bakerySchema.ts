import { z } from 'zod';

const positiveInt = z.number().int().positive();
const bps = z.number().int().min(1);
const wholePercent = z.number().int().min(1).max(100);
const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const span = <Value extends z.ZodType>(value: Value) => z.object({ min: value, max: value });

export const bakeryMechanicSchema = z.object({
  kind: z.literal('bakery'),
  unlockStage: positiveInt,
  bakePercents: z.array(wholePercent).min(2),
  staleCostBps: bps,
  wholesale: z.object({
    offerDays: positiveInt,
    maxOrders: positiveInt,
    clients: z.array(z.object({ id, name: z.string().min(1) })).min(1),
    sizePercents: z.array(wholePercent).min(1),
    priceBps: span(bps),
    days: span(positiveInt),
  }),
  centralKitchen: z.object({
    stage: positiveInt,
    priceMultiple: positiveInt,
    capacityPercent: positiveInt,
  }),
});

export type BakeryMechanic = z.output<typeof bakeryMechanicSchema>;
