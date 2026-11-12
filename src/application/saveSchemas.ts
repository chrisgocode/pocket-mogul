import { hasOwnedTaxBasis } from './taxSaveValidation';
import { TAX_READER_VERSION } from '@/domain/tax/types';
import { savedTax } from './taxSaveSchema';
import { z } from 'zod';

import { activityLog, goalProgress } from './activitySchemas';
import { adSchedule, settings, tutorialProgress } from './preferenceSchemas';
import { fromSaveDocument } from './saveDocument';
import { savedCarWash } from './carWashSaveSchema';
import { savedDelivery } from './deliverySaveSchema';
import { savedCoffeeKiosk } from './coffeeKioskSaveSchema';
import { savedFoodCart } from './foodCartSaveSchema';
import { savedLaundromat } from './laundromatSaveSchema';
import { savedTakeovers } from './takeoverSaveSchema';
import { savedVending } from './vendingSaveSchema';
import { PRICE_LEVELS } from '@/domain/business/definition';
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

const positiveCount = z.number().int().positive();
const WHOLE_PERCENT = 100;
const nonNegativeMoneyText = z.string().regex(/^\d+$/).transform(parseMoneyCents);

const business = definitionId.extend({
  stage: positiveCount,
  units: positiveCount,
  priceLevel: z.enum(PRICE_LEVELS),
  levels: z.object({ quality: level, efficiency: level }),
  payoutPercent: z.number().int().min(0).max(WHOLE_PERCENT),
  treasuryCents: nonNegativeMoneyText,
  profitRemainder: count,
  payoutRemainder: count,
  status: z.enum(['open', 'closed']),
  purchasedDay: count,
  capitalizedSpendCents: moneyText,
});

const property = definitionId.extend({
  levels: z.object({ renovation: level, furnishings: level, systems: level, expansion: level }),
  rented: z.boolean(),
  upgradeSpendCents: moneyText,
});

const income = z.object({
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
      closures: z.array(z.string().min(1)),
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

const staffCounts = z.object({ operations: count, sales: count, manager: count });

const policyStatus = z.enum(['none', 'active', 'lapsed']);
const incidentId = z.string().min(1);
const savedRisks = z.object({
  insurance: z.object({ equipment: policyStatus, liability: policyStatus, supply: policyStatus }),
  incident: z.discriminatedUnion('status', [
    z.object({ status: z.literal('none') }),
    z.object({
      status: z.literal('active'),
      incidentId,
      endsDay: count,
      capacityBps: count,
      costBps: count,
    }),
  ]),
});

const absenceIncident = z.object({
  atMs: count,
  businessId: z.string().min(1),
  incidentId,
  treasuryLossCents: nonNegativeMoneyText,
  insured: z.boolean(),
});

export const saveDocumentSchema = z.looseObject({
  tax: savedTax.default({ status: 'notStarted' }),
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
  staffing: z.record(z.string().min(1), staffCounts).default({}),
  risks: z.record(z.string().min(1), savedRisks).default({}),
  absenceIncidents: z.array(absenceIncident).default([]),
  incidentEntries: count.default(0),
  vending: z.record(z.string().min(1), savedVending).default({}),
  carWash: z.record(z.string().min(1), savedCarWash).default({}),
  delivery: z.record(z.string().min(1), savedDelivery).default({}),
  foodCart: z.record(z.string().min(1), savedFoodCart).default({}),
  coffeeKiosk: z.record(z.string().min(1), savedCoffeeKiosk).default({}),
  laundromat: z.record(z.string().min(1), savedLaundromat).default({}),
  takeovers: z.record(z.string().min(1), savedTakeovers).default({}),
  listings: z
    .record(
      z.string(),
      z.discriminatedUnion('status', [
        z.object({ status: z.literal('private') }),
        z.object({
          status: z.literal('listed'),
          ticker: z.string().regex(/^[A-Z]{3,5}$/),
          sharesHeld: quantityText,
        }),
      ]),
    )
    .default({}),
  shareholderPayouts: z
    .array(z.object({ businessId: z.string(), paidCents: nonNegativeMoneyText }))
    .default([]),
  seenCoachMarks: z.array(z.string().min(1)).default([]),
});

export const saveSchema = saveDocumentSchema
  .refine(hasOwnedTaxBasis, 'Missing owned asset tax basis')
  .refine(
    (document) =>
      document.tax.status === 'notStarted'
        ? document.minReaderVersion < TAX_READER_VERSION
        : document.minReaderVersion >= TAX_READER_VERSION,
    'Tax state and minimum reader must agree',
  )
  .transform(fromSaveDocument);
