import { z } from 'zod';

import { UPGRADE_TRACKS } from '@/domain/businessQuotes';
import type { GameCommand } from '@/domain/commands';

const businessId = z.string().min(1);

const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('TapBatch'), taps: z.number().int().positive() }),
  z.object({ type: z.literal('UpgradeWallet'), fromLevel: z.number().int().nonnegative() }),
  z.object({ type: z.literal('BuyBusiness'), businessId }),
  z.object({
    type: z.literal('UpgradeBusiness'),
    businessId,
    track: z.enum(UPGRADE_TRACKS),
    fromLevel: z.number().int().nonnegative(),
  }),
  z.object({ type: z.literal('HireManager'), businessId }),
  z.object({ type: z.literal('SellBusiness'), businessId }),
  z.object({ type: z.literal('AdvanceTime') }),
]);

export function validCommand(command: GameCommand): GameCommand | undefined {
  const parsed = gameCommandSchema.safeParse(command);
  return parsed.success ? parsed.data : undefined;
}
