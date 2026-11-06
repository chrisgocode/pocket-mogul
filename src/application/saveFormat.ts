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
const level = z.number().int().nonnegative();
const ownedBusiness = definitionId.extend({
  levels: z
    .object({ capacity: level, quality: level, efficiency: level })
    .prefault({ capacity: 0, quality: 0, efficiency: 0 }),
  managerOwned: z.boolean().default(false),
  capitalizedSpendCents: moneyText,
});
const remainder = z.number().int().nonnegative();
const returnSummary = z.discriminatedUnion('status', [
  z.object({ status: z.literal('none') }),
  z.object({
    status: z.literal('pending'),
    summary: z.object({
      awayMs: count,
      creditedMs: count,
      earnings: z.object({ businesses: moneyText }),
    }),
  }),
]);

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
  businesses: z.array(ownedBusiness),
  properties: z.array(definitionId),
  income: z
    .object({
      businessRemainders: z.record(z.string(), remainder),
      businessEarningsCents: moneyText,
    })
    .prefault({ businessRemainders: {}, businessEarningsCents: '0' }),
  unlockedTiers: z.array(z.number().int().positive()),
  returnSummary: returnSummary.prefault({ status: 'none' }),
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
