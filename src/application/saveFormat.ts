import { z } from 'zod';

import { GAME_ERROR_CODES, type CommandOutcome } from '@/domain/commands';
import { SAVE_SCHEMA_VERSION, type GameState } from '@/domain/gameState';

import { count, moneyText, saveSchemaV1, saveSchemaV2 } from './saveSchemas';

export type DecodedSave =
  | { readonly status: 'current'; readonly state: GameState }
  | { readonly status: 'migrated'; readonly state: GameState; readonly fromVersion: number }
  | { readonly status: 'newer'; readonly schemaVersion: number }
  | { readonly status: 'corrupt' };

type Migration = { readonly fromVersion: number; readonly upgrade: (raw: unknown) => GameState };

const MIGRATIONS: readonly Migration[] = [
  {
    fromVersion: 1,
    upgrade: (raw) => ({ ...saveSchemaV1.parse(raw), schemaVersion: SAVE_SCHEMA_VERSION }),
  },
];

const versioned = z.object({ schemaVersion: z.number().int() });

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

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function migrated(raw: unknown, fromVersion: number): DecodedSave {
  const migration = MIGRATIONS.find((step) => step.fromVersion === fromVersion);
  if (migration === undefined) return { status: 'corrupt' };
  try {
    return { status: 'migrated', state: migration.upgrade(raw), fromVersion };
  } catch {
    return { status: 'corrupt' };
  }
}

function current(raw: unknown): DecodedSave {
  const parsed = saveSchemaV2.safeParse(raw);
  return parsed.success ? { status: 'current', state: parsed.data } : { status: 'corrupt' };
}

export function decodeSave(text: string): DecodedSave {
  const raw = parseJson(text);
  const header = versioned.safeParse(raw);
  if (!header.success) return { status: 'corrupt' };
  const { schemaVersion } = header.data;
  if (schemaVersion > SAVE_SCHEMA_VERSION) return { status: 'newer', schemaVersion };
  return schemaVersion === SAVE_SCHEMA_VERSION ? current(raw) : migrated(raw, schemaVersion);
}

export function encodeOutcome(outcome: CommandOutcome): string {
  return JSON.stringify(outcome, bigintsAsText);
}

export function decodeOutcome(text: string): CommandOutcome {
  return outcomeSchema.parse(JSON.parse(text));
}
