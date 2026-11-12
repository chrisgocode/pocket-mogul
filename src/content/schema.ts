import { taxRulesSchema } from './taxSchema';
import { z } from 'zod';

import { PRICE_LEVELS } from '@/domain/business/definition';
import type { MoneyCents, PriceMicros } from '@/domain/money';

import { eventTemplateSchema, marketParamsSchema } from './marketSchema';
import { incidentSchema, riskRulesSchema } from './riskSchema';
import { mechanicSchema } from './mechanicSchema';
import { rivalSchema, takeoverRulesSchema } from './takeoverSchema';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case');
const ticker = z.string().regex(/^[A-Z]{2,5}$/, 'Tickers are 2–5 capital letters');
const hexColor = z.string().regex(/^#[0-9A-F]{6}$/, 'Colors are #RRGGBB uppercase');

const positiveCents = z
  .bigint()
  .positive()
  .transform((v) => v as MoneyCents);
const nonNegativeCents = z
  .bigint()
  .nonnegative()
  .transform((v) => v as MoneyCents);
const positivePrice = z
  .bigint()
  .positive()
  .transform((v) => v as PriceMicros);

const bps = z.number().int();
const nonNegativeBps = bps.nonnegative();
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

const growthRatio = z
  .object({ numerator: positiveInt, denominator: positiveInt })
  .refine((r) => r.numerator >= r.denominator, 'Growth ratios must be at least 1');

const GLYPHS = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'hexagon',
  'bolt',
  'leaf',
  'drop',
  'ring',
  'bars',
  'cross',
  'star',
  'wave',
  'arch',
] as const;

const logoSchema = z.object({
  glyph: z.enum(GLYPHS),
  color: hexColor,
});

export const TIERS = [1, 2, 3, 4] as const;
const tierSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const SECTORS = [
  'technology',
  'commerce',
  'mobility',
  'finance',
  'energy',
  'food',
  'industrials',
  'health',
  'telecom',
  'media',
  'mining',
] as const;
const sectorSchema = z.enum(SECTORS);

const byPriceLevel = z.object({
  budget: positiveInt,
  value: positiveInt,
  standard: positiveInt,
  premium: positiveInt,
  luxury: positiveInt,
});

const staffCounts = z.object({
  operations: nonNegativeInt,
  sales: nonNegativeInt,
  manager: nonNegativeInt,
});

const wholePercent = z.number().int().min(0).max(100);

const businessSchema = z.object({
  id,
  name: z.string().min(1),
  tier: tierSchema,
  price: positiveCents,
  unitName: z.string().min(1),
  customerName: z.string().min(1),
  pricePerCustomer: positiveCents,
  revenuePerDay: positiveCents,
  costsPerDay: nonNegativeCents,
  demandResponseBps: byPriceLevel.optional(),
  incidents: z.array(incidentSchema),
  mechanic: mechanicSchema.optional(),
  rivals: z.array(rivalSchema),
  logo: logoSchema,
});

const stockSchema = z.object({
  id,
  ticker,
  name: z.string().min(1),
  sector: sectorSchema,
  volatilityClass: z.enum(['standard', 'blue_chip', 'penny']),
  initialPrice: positivePrice,

  dividendCentsPerSharePerHour: nonNegativeCents,
  description: z.string().min(1),
  logo: logoSchema,
});

const coinSchema = z.object({
  id,
  ticker,
  name: z.string().min(1),
  theme: z.string().min(1),
  initialPrice: positivePrice,
  story: z.string().min(1),
  logo: logoSchema,
});

const propertySchema = z.object({
  id,
  name: z.string().min(1),
  price: positiveCents,
  rentPerMinute: positiveCents,
  upkeepPerMinute: nonNegativeCents,
  expansionAllowed: z.boolean(),
  logo: logoSchema,
});

const goalSchema = z.discriminatedUnion('kind', [
  z.object({
    id,
    kind: z.literal('first_action'),
    action: z.enum([
      'wallet_upgrade',
      'business_purchase',
      'rental_started',
      'stock_purchase',
      'crypto_purchase',
      'dividend_received',
    ]),
    title: z.string().min(1),
  }),
  z.object({
    id,
    kind: z.literal('peak_net_worth'),
    threshold: positiveCents,
    title: z.string().min(1),
  }),
]);

const economySchema = z.object({
  tap: z.object({
    baseCents: positiveCents,
    perLevelCents: positiveCents,
    maxLevel: positiveInt,
    upgradeBaseCents: positiveCents,
    upgradeGrowth: growthRatio,
    artworkLevels: z.array(nonNegativeInt).min(1),
  }),
  boost: z.object({
    tapMultiplier: positiveInt,
    durationMs: positiveInt,
  }),
  businessRules: z.object({
    dayMs: positiveInt,
    priceBps: byPriceLevel,
    demandBps: byPriceLevel,
    defaultPriceLevel: z.enum(PRICE_LEVELS),
    baseDemandPercent: positiveInt,
    costPerCustomerPercent: wholePercent,
    extraUnitDemandPercent: nonNegativeInt,
    unitPriceBps: positiveInt,
    unitPriceGrowth: growthRatio,
    stages: z
      .array(
        z.object({
          unitCap: positiveInt,
          staffCap: staffCounts,
          upgradePriceMultiple: nonNegativeInt,
          daysOwnedToReach: nonNegativeInt,
        }),
      )
      .min(1),
    staff: z.object({
      operationsCapacityPercent: nonNegativeInt,
      salesDemandPercent: nonNegativeInt,
      managerProfitPercent: nonNegativeInt,
      wagePercent: staffCounts,
      signingFeeDays: nonNegativeInt,
    }),
    risks: riskRulesSchema,
    takeovers: takeoverRulesSchema,
    sectorMultipleDays: positiveInt,
    maxTrackLevel: positiveInt,
    upgradeWeightBps: z.object({ quality: positiveInt, efficiency: positiveInt }),
    upgradeGrowth: growthRatio,
    qualityDemandPercent: nonNegativeInt,
    efficiencySavingPercent: nonNegativeInt,
    defaultPayoutPercent: wholePercent,
    payoutStepPercent: positiveInt,
    saleReturnPercent: wholePercent,
  }),
  tierUnlocks: z.object({
    2: positiveCents,
    3: positiveCents,
    4: positiveCents,
  }),
  propertyRules: z.object({
    maxUpgradeLevel: positiveInt,
    maxExpansionLevel: positiveInt,
    upgradeWeightBps: z.object({
      renovation: positiveInt,
      furnishings: positiveInt,
      systems: positiveInt,
      expansion: positiveInt,
    }),
    upgradeGrowth: growthRatio,
    levelEffectPercent: z.object({
      renovationRent: nonNegativeInt,
      furnishingsRent: nonNegativeInt,
      systemsSaving: nonNegativeInt,
      expansionRentAndUpkeep: nonNegativeInt,
    }),
    valueUpgradePercent: z.number().int().min(0).max(100),
    saleValuePercent: z.number().int().min(0).max(100),
  }),
  market: z.object({
    tickMs: positiveInt,
    regimeEveryTicks: positiveInt,
    regimeChancePercent: z.object({
      bear: nonNegativeInt,
      neutral: nonNegativeInt,
      bull: nonNegativeInt,
    }),
    eventEveryTicks: positiveInt,
    eventChancePercent: z.object({
      asset: nonNegativeInt,
      sector: nonNegativeInt,
      market: nonNegativeInt,
    }),
    stocks: marketParamsSchema,
    pennyAssetShockBps: nonNegativeBps,
    crypto: marketParamsSchema,
    anchorPullBps: nonNegativeBps,
    anchorClampBps: nonNegativeBps,
    totalReturnClampBps: positiveInt,
    minBuyNotional: positiveCents,
    minuteHistoryLength: positiveInt,
    hourlyHistoryLength: positiveInt,
  }),
  taxes: taxRulesSchema.optional(),
  time: z.object({
    offlineCapMs: positiveInt,
    tapBatchMaxMs: positiveInt,
    foregroundCheckpointMs: positiveInt,
  }),
  save: z.object({
    historyEntries: positiveInt,
    backups: positiveInt,
    receiptRetentionDays: positiveInt,
  }),
  ads: z.object({
    gateAfterForegroundMs: positiveInt,
    interstitialMinGapMs: positiveInt,
    interstitialDailyCap: positiveInt,
    tapIdleBeforeAdMs: positiveInt,
    adBreakCardMs: positiveInt,
    afterRewardedQuietMs: positiveInt,
    appOpenMinSession: positiveInt,
    appOpenMinAwayMs: positiveInt,
    appOpenMinGapMs: positiveInt,
  }),
});

export const contentSchema = z.object({
  economyVersion: positiveInt,
  economy: economySchema,
  businesses: z.array(businessSchema).min(1),
  stocks: z.array(stockSchema).min(1),
  coins: z.array(coinSchema).min(1),
  properties: z.array(propertySchema).min(1),
  goals: z.array(goalSchema).min(1),
  events: z.array(eventTemplateSchema).min(1),

  retiredIds: z.array(id),
});

export type ContentInput = z.input<typeof contentSchema>;
export type Content = z.output<typeof contentSchema>;
export type Business = Content['businesses'][number];
export type BusinessContentRules = Content['economy']['businessRules'];
export type Stock = Content['stocks'][number];
export type Coin = Content['coins'][number];
export type Property = Content['properties'][number];
export type Goal = Content['goals'][number];
export type EventTemplate = Content['events'][number];
export type Logo = z.output<typeof logoSchema>;
export type Glyph = (typeof GLYPHS)[number];
export type Tier = (typeof TIERS)[number];
export type Sector = (typeof SECTORS)[number];
