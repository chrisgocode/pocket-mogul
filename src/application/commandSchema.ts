import { z } from 'zod';

import type { GameCommand } from '@/domain/commands';

const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('TapBatch'), taps: z.number().int().positive() }),
  z.object({ type: z.literal('UpgradeWallet'), fromLevel: z.number().int().nonnegative() }),
]);

export function validCommand(command: GameCommand): GameCommand | undefined {
  const parsed = gameCommandSchema.safeParse(command);
  return parsed.success ? parsed.data : undefined;
}
