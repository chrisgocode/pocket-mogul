import { z } from 'zod';

import type { GameCommand } from '@/domain/commands';

const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('TapBatch'), taps: z.number().int().positive() }),
  z.object({ type: z.literal('UpgradeWallet'), fromLevel: z.number().int().nonnegative() }),
  z.object({ type: z.literal('BuyBusiness'), businessId: z.string().min(1) }),
  z.object({ type: z.literal('AdvanceTime') }),
]);

export function validCommand(command: GameCommand): GameCommand | undefined {
  const parsed = gameCommandSchema.safeParse(command);
  return parsed.success ? parsed.data : undefined;
}
