import { TAX_READER_VERSION } from '@/domain/tax/types';
import { z } from 'zod';

import { GAME_ERROR_CODES, type CommandOutcome } from '@/domain/commands';
import { SAVE_SCHEMA_VERSION, type GameState } from '@/domain/gameState';

import { toSaveDocument } from './saveDocument';
import { count, formatVersion, moneyText, saveSchema } from './saveSchemas';

export type DecodedSave =
  | { readonly status: 'current'; readonly state: GameState }
  | { readonly status: 'migrated'; readonly state: GameState; readonly fromVersion: number }
  | { readonly status: 'newer' }
  | { readonly status: 'replaced'; readonly reason: ReplacedSave }
  | { readonly status: 'corrupt' };

export type ReplacedSave = 'PRE_BASELINE_SAVE' | 'RETIRED_FORMAT_SAVE';

export type Migration = {
  readonly fromVersion: number;
  readonly upgrade: (raw: unknown) => GameState;
};

export type SaveFormat = {
  readonly readerVersion: number;
  readonly schemaVersion?: number;
  readonly schema: z.ZodType<GameState>;
  readonly migrations: readonly Migration[];
  readonly freshStartBelowVersion: number;
};

const DEEP_BUSINESS_VERSION = 2;

export const SAVE_FORMAT: SaveFormat = {
  readerVersion: TAX_READER_VERSION,
  schemaVersion: SAVE_SCHEMA_VERSION,
  schema: saveSchema,
  migrations: [],
  freshStartBelowVersion: DEEP_BUSINESS_VERSION,
};

const header = z.object({
  schemaVersion: formatVersion,
  minReaderVersion: formatVersion.optional(),
});

const outcomeSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), revision: count, cashChangeCents: moneyText }),
  z.object({ ok: z.literal(false), error: z.enum(GAME_ERROR_CODES) }),
]);

function bigintsAsText(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function encodeSave(state: GameState): string {
  return JSON.stringify(toSaveDocument(state), bigintsAsText);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function migrated(format: SaveFormat, saved: { raw: unknown; fromVersion: number }): DecodedSave {
  const { raw, fromVersion } = saved;
  const migration = format.migrations.find((step) => step.fromVersion === fromVersion);
  if (migration === undefined) return { status: 'corrupt' };
  try {
    return { status: 'migrated', state: migration.upgrade(raw), fromVersion };
  } catch {
    return { status: 'corrupt' };
  }
}

function current(format: SaveFormat, raw: unknown): DecodedSave {
  const parsed = format.schema.safeParse(raw);
  return parsed.success ? { status: 'current', state: parsed.data } : { status: 'corrupt' };
}

export function decodeSaveIn(format: SaveFormat, text: string): DecodedSave {
  const raw = parseJson(text);
  const parsed = header.safeParse(raw);
  if (!parsed.success) return { status: 'corrupt' };
  const { schemaVersion, minReaderVersion } = parsed.data;
  if (minReaderVersion === undefined) return { status: 'replaced', reason: 'PRE_BASELINE_SAVE' };
  if (minReaderVersion > format.readerVersion) return { status: 'newer' };
  if (schemaVersion < format.freshStartBelowVersion) {
    return { status: 'replaced', reason: 'RETIRED_FORMAT_SAVE' };
  }
  if (schemaVersion < (format.schemaVersion ?? format.readerVersion))
    return migrated(format, { raw, fromVersion: schemaVersion });
  return current(format, raw);
}

export function decodeSave(text: string): DecodedSave {
  return decodeSaveIn(SAVE_FORMAT, text);
}

export function encodeOutcome(outcome: CommandOutcome): string {
  return JSON.stringify(outcome, bigintsAsText);
}

export function decodeOutcome(text: string): CommandOutcome {
  return outcomeSchema.parse(JSON.parse(text));
}
