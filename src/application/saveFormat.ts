import { z } from 'zod';

import { GAME_ERROR_CODES, type CommandOutcome } from '@/domain/commands';
import { SAVE_SCHEMA_VERSION, type GameState } from '@/domain/gameState';
import { parseMoneyCents } from '@/domain/money';

const moneyText = z
  .string()
  .regex(/^-?\d+$/)
  .transform(parseMoneyCents);
const count = z.number().int().nonnegative();
const definitionId = z.object({ definitionId: z.string().min(1) });

const savedGameSchema = z.object({
  saveId: z.string().min(1),
  schemaVersion: z.literal(SAVE_SCHEMA_VERSION),
  economyVersion: z.number().int().positive(),
  revision: count,
  cashCents: moneyText,
  peakNetWorthCents: moneyText,
  lifetimeTapEarningsCents: moneyText,
  clock: z.object({ simulationMs: count, lastWallCheckpointMs: z.number().int() }),
  tap: z.object({ walletLevel: count, totalAcceptedTaps: count }),
  businesses: z.array(definitionId),
  properties: z.array(definitionId),
  unlockedTiers: z.array(z.number().int().positive()),
});

const outcomeSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), revision: count, cashChangeCents: moneyText }),
  z.object({ ok: z.literal(false), error: z.enum(GAME_ERROR_CODES) }),
]);

function bigintsAsText(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function encodeSave(state: GameState): string {
  return JSON.stringify(state, bigintsAsText);
}

export function decodeSave(text: string): GameState {
  return savedGameSchema.parse(JSON.parse(text));
}

export function encodeOutcome(outcome: CommandOutcome): string {
  return JSON.stringify(outcome, bigintsAsText);
}

export function decodeOutcome(text: string): CommandOutcome {
  return outcomeSchema.parse(JSON.parse(text));
}
