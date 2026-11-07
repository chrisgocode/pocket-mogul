import { z } from 'zod';

import { activityLog, goalProgress } from './activitySchemas';
import { adSchedule, settings, tutorialProgress } from './preferenceSchemas';
import { parseMoneyCents, parsePriceMicros, parseQuantityMicrounits } from '@/domain/money';

export const moneyText = z
  .string()
  .regex(/^-?\d+$/)
  .transform(parseMoneyCents);
export const count = z.number().int().nonnegative();
export const formatVersion = z.number().int().positive();
const definitionId = z.object({ definitionId: z.string().min(1) });
const level = z.number().int().nonnegative();
const remainders = z.record(z.string(), z.number().int().nonnegative());

const priceText = z.string().regex(/^\d+$/).transform(parsePriceMicros);
const candle = z.object({ open: priceText, high: priceText, low: priceText, close: priceText });
const market = z.object({
  seed: z.string().min(1),
  tick: count,
  quotes: z.record(z.string(), priceText),
  candles: z.record(z.string(), candle),
});

const business = definitionId.extend({
  levels: z.object({ capacity: level, quality: level, efficiency: level }),
  managerOwned: z.boolean(),
  capitalizedSpendCents: moneyText,
});

const property = definitionId.extend({
  levels: z.object({ renovation: level, furnishings: level, systems: level, expansion: level }),
  rented: z.boolean(),
  upgradeSpendCents: moneyText,
});

const income = z.object({
  businessRemainders: remainders,
  businessEarningsCents: moneyText,
  rentRemainders: remainders,
  rentEarningsCents: moneyText,
  dividendEarningsCents: moneyText,
});

const returnSummary = z.discriminatedUnion('status', [
  z.object({ status: z.literal('none') }),
  z.object({
    status: z.literal('pending'),
    summary: z.object({
      awayMs: count,
      creditedMs: count,
      earnings: z.object({ businesses: moneyText, rent: moneyText, dividends: moneyText }),
    }),
  }),
]);

const quantityText = z.string().regex(/^\d+$/).transform(parseQuantityMicrounits);
const position = z.object({
  instrumentId: z.string().min(1),
  quantity: quantityText,
  remainingBasisCents: moneyText,
  realizedProfitCents: moneyText,
});

const dividendAccrual = z.object({
  instrumentId: z.string().min(1),
  pendingCents: moneyText,
  entitlementNumerator: z.string().regex(/^\d+$/).transform(BigInt),
});

const grantId = z.string().min(1);
const boost = z.discriminatedUnion('status', [
  z.object({ status: z.literal('none') }),
  z.object({ status: z.literal('pending'), grantId }),
  z.object({ status: z.literal('active'), grantId, remainingMs: z.number().int().positive() }),
]);

export const saveSchema = z.looseObject({
  saveId: z.string().min(1),
  schemaVersion: formatVersion,
  minReaderVersion: formatVersion,
  economyVersion: z.number().int().positive(),
  revision: count,
  cashCents: moneyText,
  peakNetWorthCents: moneyText,
  lifetimeTapEarningsCents: moneyText,
  clock: z.object({ simulationMs: count, lastWallCheckpointMs: z.number().int() }),
  tap: z.object({ walletLevel: count, totalAcceptedTaps: count }),
  businesses: z.array(business),
  properties: z.array(property),
  income,
  unlockedTiers: z.array(z.number().int().positive()),
  returnSummary,
  market,
  tradingUnlocked: z.boolean(),
  positions: z.array(position),
  dividendAccruals: z.array(dividendAccrual),
  watchlist: z.array(z.string().min(1)),
  reward: z.object({ boost, processedRewardIds: z.array(grantId) }),
  goals: goalProgress,
  activity: activityLog,
  tutorial: tutorialProgress,
  settings,
  adSchedule,
});
