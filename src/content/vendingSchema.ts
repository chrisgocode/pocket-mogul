import { z } from 'zod';

import { STOCK_MIXES } from '@/domain/business/vendingRules';
import { moneyCents } from '@/domain/money';

const positiveInt = z.number().int().positive();
const wholePercent = z.number().int().min(0).max(100);
const bps = z.number().int().min(1);
const positiveCents = z.bigint().positive().transform(moneyCents);

const productSplit = z.object({
  snacks: wholePercent,
  drinks: wholePercent,
  healthy: wholePercent,
});

const locationSchema = z.object({
  slots: positiveInt,
  trafficBps: bps,
  taste: productSplit,
  restockFeePerMachineCents: positiveCents,
});

export const vendingMechanicSchema = z.object({
  kind: z.literal('vending'),
  unlockStage: positiveInt,
  defaultMix: z.enum(STOCK_MIXES),
  stockPerMachine: positiveInt,
  matchBps: z.object({ poor: bps, perfect: bps }),
  locations: z.object({
    office: locationSchema,
    gym: locationSchema,
    school: locationSchema,
    station: locationSchema,
    hospital: locationSchema,
  }),
  mixes: z.object({
    snacks: productSplit,
    drinks: productSplit,
    healthy: productSplit,
    balanced: productSplit,
  }),
  cardReaders: z.object({
    stage: positiveInt,
    priceMultiple: positiveInt,
    demandPercent: positiveInt,
  }),
});

export type VendingMechanic = z.output<typeof vendingMechanicSchema>;
