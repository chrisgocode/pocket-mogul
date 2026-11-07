import { z } from 'zod';

import { UPGRADE_TRACKS } from '@/domain/businessQuotes';
import type { GameCommand } from '@/domain/commands';
import { quantityMicrounits } from '@/domain/money';
import { PROPERTY_TRACKS } from '@/domain/propertyQuotes';

const businessId = z.string().min(1);
const propertyId = z.string().min(1);
const fromLevel = z.number().int().nonnegative();
const assetId = z.string().min(1);

const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('TapBatch'), taps: z.number().int().positive() }),
  z.object({ type: z.literal('UpgradeWallet'), fromLevel: z.number().int().nonnegative() }),
  z.object({ type: z.literal('BuyBusiness'), businessId }),
  z.object({
    type: z.literal('UpgradeBusiness'),
    businessId,
    track: z.enum(UPGRADE_TRACKS),
    fromLevel,
  }),
  z.object({ type: z.literal('HireManager'), businessId }),
  z.object({ type: z.literal('SellBusiness'), businessId }),
  z.object({ type: z.literal('BuyProperty'), propertyId }),
  z.object({
    type: z.literal('UpgradeProperty'),
    propertyId,
    track: z.enum(PROPERTY_TRACKS),
    fromLevel,
  }),
  z.object({ type: z.literal('SetRentalStatus'), propertyId, rented: z.boolean() }),
  z.object({ type: z.literal('SellProperty'), propertyId }),
  z.object({
    type: z.literal('ExecuteTrade'),
    assetId,
    side: z.enum(['buy', 'sell']),
    quantity: z.bigint().transform(quantityMicrounits),
    quotedTick: z.number().int().nonnegative(),
  }),
  z.object({ type: z.literal('SetWatchlist'), assetId, watched: z.boolean() }),
  z.object({ type: z.literal('AdvanceTime') }),
  z.object({ type: z.literal('SettleOffline') }),
  z.object({ type: z.literal('AcknowledgeReturnSummary') }),
]);

export function validCommand(command: GameCommand): GameCommand | undefined {
  const parsed = gameCommandSchema.safeParse(command);
  return parsed.success ? parsed.data : undefined;
}
