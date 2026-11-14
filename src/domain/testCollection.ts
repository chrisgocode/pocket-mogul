import type { CollectionEconomy } from './collection/rules';
import { dollars } from './money';

export const DAY_MS = 600_000;

export const testCollection: CollectionEconomy = {
  rules: {
    dayMs: DAY_MS,
    lotCount: 2,
    passLotCount: 1,
    perkCaps: { tap: 30, resale: 6 },
    lotDays: 6,
    saleReturnPercent: 90,
    rarityWeights: { common: 6, uncommon: 3, rare: 1 },
    categories: [
      {
        id: 'wine',
        swingBps: 0,
        swingDays: 6,
        swing: 'smooth',
        ageCurve: [
          { days: 0, bps: 10_000 },
          { days: 10, bps: 12_000 },
        ],
      },
      {
        id: 'cars',
        swingBps: 0,
        swingDays: 4,
        swing: 'smooth',
        ageCurve: [
          { days: 0, bps: 10_000 },
          { days: 4, bps: 8000 },
          { days: 8, bps: 13_000 },
        ],
      },
      { id: 'art', swingBps: 2500, swingDays: 3, swing: 'smooth', ageCurve: [] },
      { id: 'curiosities', swingBps: 3000, swingDays: 12, swing: 'step', ageCurve: [] },
    ],
  },
  sets: [
    {
      id: 'garage',
      access: 'open',
      pieceIds: ['table_red', 'roadster'],
      perk: { kind: 'resale', percent: 4 },
    },
    {
      id: 'gallery',
      access: 'open',
      pieceIds: ['sketch', 'meteorite'],
      perk: { kind: 'tap', percent: 5 },
    },
  ],
  pieces: [
    { id: 'table_red', category: 'wine', tier: 1, rarity: 'common', price: dollars('500') },
    { id: 'roadster', category: 'cars', tier: 1, rarity: 'common', price: dollars('1,000') },
    { id: 'sketch', category: 'art', tier: 1, rarity: 'uncommon', price: dollars('2,000') },
    { id: 'meteorite', category: 'curiosities', tier: 2, rarity: 'rare', price: dollars('9,000') },
    { id: 'watch', category: 'watches', tier: 4, rarity: 'rare', price: dollars('50,000') },
  ],
};
