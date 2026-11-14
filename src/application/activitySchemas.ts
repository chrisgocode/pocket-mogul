import { z } from 'zod';

import type { ActivityEntry } from '@/domain/activity';
import { parseMoneyCents, parseQuantityMicrounits } from '@/domain/money';

const cents = z
  .string()
  .regex(/^-?\d+$/)
  .transform(parseMoneyCents);
const count = z.number().int().nonnegative();
const assetId = z.string().min(1);
const quantityText = z.string().regex(/^\d+$/).transform(parseQuantityMicrounits);

const groupedEarnings = {
  fromMs: count,
  taps: count,
  tapCents: cents,
  businessCents: cents,
  rentCents: cents,
};

const assetDeal = {
  asset: z.enum(['business', 'property', 'collectible']),
  assetId,
  cashChangeCents: cents,
};

const activityEvent = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('earnings'), ...groupedEarnings }),
  z.object({ kind: z.literal('purchase'), ...assetDeal }),
  z.object({ kind: z.literal('sale'), ...assetDeal }),
  z.object({
    kind: z.literal('upgrade'),
    target: z.enum(['wallet', 'property']),
    assetId,
    track: z.string().min(1),
    level: count,
    cashChangeCents: cents,
  }),
  z.object({
    kind: z.literal('improvement'),
    assetId,
    track: z.enum(['units', 'stage', 'quality', 'efficiency', 'operations', 'sales', 'manager']),
    level: count,
    treasuryChangeCents: cents,
  }),
  z.object({ kind: z.literal('treasury'), assetId, cashChangeCents: cents }),
  z.object({ kind: z.literal('closure'), assetId, closedAtMs: count }),
  z.object({
    kind: z.literal('incident'),
    assetId,
    incidentId: z.string().min(1),
    treasuryChangeCents: cents,
    insured: z.boolean(),
  }),
  z.object({ kind: z.literal('rental'), assetId, rented: z.boolean() }),
  z.object({
    kind: z.literal('trade'),
    side: z.enum(['buy', 'sell']),
    assetId,
    quantity: quantityText,
    cashChangeCents: cents,
    realizedProfitCents: cents,
  }),
  z.object({ kind: z.literal('dividend'), cashChangeCents: cents }),
  z.object({
    kind: z.literal('ranking'),
    direction: z.enum(['passed', 'overtaken']),
    mogulId: assetId,
    place: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal('offline'),
    awayMs: count,
    creditedMs: count,
    earnings: z.object({ businesses: cents, rent: cents, dividends: cents }),
    closures: z.array(assetId),
  }),
]);

const activityEntry = z.intersection(
  activityEvent,
  z.object({ sequence: z.number().int().positive(), simulationMs: count }),
);

const byKind = z.object({
  earnings: count,
  purchase: count,
  sale: count,
  upgrade: count,
  improvement: count,
  treasury: count,
  closure: count,
  rental: count,
  trade: count,
  dividend: count,
  offline: count,
});

export const activityLog = z.object({
  open: z.object(groupedEarnings).nullable(),
  lifetime: z.object({
    entries: count,
    byKind,
    spentCents: cents,
    proceedsCents: cents,
  }),
});

export const goalProgress = z.object({
  completed: z.array(z.object({ goalId: z.string().min(1), simulationMs: count })),
  pinnedGoalId: z.string().min(1).nullable(),
});

function bigintsAsText(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function encodeActivityEntry(entry: ActivityEntry): string {
  return JSON.stringify(entry, bigintsAsText);
}

export function decodeActivityEntry(text: string): ActivityEntry {
  return activityEntry.parse(JSON.parse(text));
}
