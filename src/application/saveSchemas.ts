import { z } from 'zod';

import { SAVE_SCHEMA_VERSION } from '@/domain/gameState';
import { parseMoneyCents, parsePriceMicros } from '@/domain/money';

export const moneyText = z
  .string()
  .regex(/^-?\d+$/)
  .transform(parseMoneyCents);
export const count = z.number().int().nonnegative();
const definitionId = z.object({ definitionId: z.string().min(1) });
const level = z.number().int().nonnegative();
const remainders = z.record(z.string(), z.number().int().nonnegative());
const businessLevels = z.object({ capacity: level, quality: level, efficiency: level });
const propertyLevels = z.object({
  renovation: level,
  furnishings: level,
  systems: level,
  expansion: level,
});

const priceText = z.string().regex(/^\d+$/).transform(parsePriceMicros);
const candle = z.object({ open: priceText, high: priceText, low: priceText, close: priceText });
const market = z.object({
  seed: z.string().min(1),
  tick: count,
  quotes: z.record(z.string(), priceText),
  candles: z.record(z.string(), candle),
});

const MARKET_TICK_MS_BEFORE_MARKETS = 60_000;

const savedHeader = {
  saveId: z.string().min(1),
  economyVersion: z.number().int().positive(),
  revision: count,
  cashCents: moneyText,
  peakNetWorthCents: moneyText,
  lifetimeTapEarningsCents: moneyText,
  clock: z.object({ simulationMs: count, lastWallCheckpointMs: z.number().int() }),
  tap: z.object({ walletLevel: count, totalAcceptedTaps: count }),
  unlockedTiers: z.array(z.number().int().positive()),
};

const awayReport = <Earnings extends z.ZodType>(earnings: Earnings) =>
  z.discriminatedUnion('status', [
    z.object({ status: z.literal('none') }),
    z.object({
      status: z.literal('pending'),
      summary: z.object({ awayMs: count, creditedMs: count, earnings }),
    }),
  ]);

const saveSchemaV1Fields = z.object({
  ...savedHeader,
  schemaVersion: z.literal(1),
  businesses: z.array(
    definitionId.extend({
      levels: businessLevels.prefault({ capacity: 0, quality: 0, efficiency: 0 }),
      managerOwned: z.boolean().default(false),
      capitalizedSpendCents: moneyText,
    }),
  ),
  properties: z.array(
    definitionId.extend({
      levels: propertyLevels.prefault({
        renovation: 0,
        furnishings: 0,
        systems: 0,
        expansion: 0,
      }),
      rented: z.boolean().default(false),
      upgradeSpendCents: moneyText.prefault('0'),
    }),
  ),
  income: z
    .object({
      businessRemainders: remainders,
      businessEarningsCents: moneyText,
      rentRemainders: remainders.prefault({}),
      rentEarningsCents: moneyText.prefault('0'),
    })
    .prefault({ businessRemainders: {}, businessEarningsCents: '0' }),
  returnSummary: awayReport(
    z.object({ businesses: moneyText, rent: moneyText.prefault('0') }),
  ).prefault({ status: 'none' }),
  market: market.optional(),
});

export const saveSchemaV1 = saveSchemaV1Fields.transform((saved) => ({
  ...saved,
  market: saved.market ?? {
    seed: saved.saveId,
    tick: Math.floor(saved.clock.simulationMs / MARKET_TICK_MS_BEFORE_MARKETS),
    quotes: {},
    candles: {},
  },
}));

export const saveSchemaV2 = z.object({
  ...savedHeader,
  schemaVersion: z.literal(SAVE_SCHEMA_VERSION),
  businesses: z.array(
    definitionId.extend({
      levels: businessLevels,
      managerOwned: z.boolean(),
      capitalizedSpendCents: moneyText,
    }),
  ),
  properties: z.array(
    definitionId.extend({
      levels: propertyLevels,
      rented: z.boolean(),
      upgradeSpendCents: moneyText,
    }),
  ),
  income: z.object({
    businessRemainders: remainders,
    businessEarningsCents: moneyText,
    rentRemainders: remainders,
    rentEarningsCents: moneyText,
  }),
  returnSummary: awayReport(z.object({ businesses: moneyText, rent: moneyText })),
  market,
});
