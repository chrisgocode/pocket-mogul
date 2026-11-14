import { z } from 'zod';

import {
  COLLECTIBLE_CATEGORIES,
  PERK_KINDS,
  RARITIES,
  SET_ACCESS,
  SWING_SHAPES,
} from '@/domain/collection/rules';
import { moneyCents } from '@/domain/money';

const MOST_SWING_BPS = 9999;
const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case');
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const wholePercent = z.number().int().min(0).max(100);
const tier = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const categorySchema = z.object({
  id: z.enum(COLLECTIBLE_CATEGORIES),
  name: z.string().min(1),
  valueNote: z.string().min(1),
  swingBps: nonNegativeInt.max(MOST_SWING_BPS),
  swingDays: positiveInt,
  swing: z.enum(SWING_SHAPES),
  ageCurve: z.array(z.object({ days: nonNegativeInt, bps: positiveInt })).min(1),
});

const pieceSchema = z.object({
  id,
  name: z.string().min(1),
  note: z.string().min(1),
  category: z.enum(COLLECTIBLE_CATEGORIES),
  tier,
  rarity: z.enum(RARITIES),
  price: z.bigint().positive().transform(moneyCents),
});

const setSchema = z.object({
  id,
  name: z.string().min(1),
  category: z.enum(COLLECTIBLE_CATEGORIES),
  access: z.enum(SET_ACCESS).default('open'),
  pieceIds: z.array(id).min(1),
  perk: z.object({ kind: z.enum(PERK_KINDS), percent: positiveInt }),
});

export const collectionSchema = z.object({
  lotCount: nonNegativeInt,
  passLotCount: nonNegativeInt.default(0),
  lotDays: positiveInt,
  saleReturnPercent: wholePercent,
  rarityWeights: z.object({ common: positiveInt, uncommon: positiveInt, rare: positiveInt }),
  categories: z.array(categorySchema),
  perkCaps: z.object({ tap: wholePercent, resale: wholePercent }),
  sets: z.array(setSchema),
  pieces: z.array(pieceSchema),
});

export const NO_COLLECTION_CONTENT = {
  lotCount: 0,
  passLotCount: 0,
  lotDays: 1,
  saleReturnPercent: 0,
  rarityWeights: { common: 1, uncommon: 1, rare: 1 },
  categories: [],
  perkCaps: { tap: 0, resale: 0 },
  sets: [],
  pieces: [],
};

export type CollectionCategory = z.output<typeof categorySchema>;
export type CollectionSetContent = z.output<typeof setSchema>;
export type CollectionPiece = z.output<typeof pieceSchema>;
