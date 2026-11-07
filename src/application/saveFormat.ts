import { z } from 'zod';

import { GAME_ERROR_CODES, type CommandOutcome } from '@/domain/commands';
import {
  SAVE_SCHEMA_VERSION,
  type GameState,
  type IncomeBySource,
  type IncomeState,
  type PendingReturnSummary,
  type ReturnSummary,
} from '@/domain/gameState';
import { moneyCents } from '@/domain/money';

import {
  count,
  moneyText,
  saveSchemaV1,
  saveSchemaV2,
  saveSchemaV3,
  saveSchemaV4,
} from './saveSchemas';

export type DecodedSave =
  | { readonly status: 'current'; readonly state: GameState }
  | { readonly status: 'migrated'; readonly state: GameState; readonly fromVersion: number }
  | { readonly status: 'newer'; readonly schemaVersion: number }
  | { readonly status: 'corrupt' };

type Migration = { readonly fromVersion: number; readonly upgrade: (raw: unknown) => GameState };

type EarningsBeforeDividends = Omit<IncomeBySource, 'dividends'>;

type SummaryBeforeDividends =
  | { readonly status: 'none' }
  | {
      readonly status: 'pending';
      readonly summary: Omit<ReturnSummary, 'earnings'> & {
        readonly earnings: EarningsBeforeDividends;
      };
    };

type SaveBeforeDividends = Omit<GameState, 'income' | 'returnSummary' | 'dividends'> & {
  readonly income: Omit<IncomeState, 'dividendEarningsCents'>;
  readonly returnSummary: SummaryBeforeDividends;
};

type SaveBeforeTrading = Omit<SaveBeforeDividends, 'tradingUnlocked' | 'positions' | 'watchlist'>;

function withTrading(saved: SaveBeforeTrading): SaveBeforeDividends {
  return {
    ...saved,
    tradingUnlocked: saved.businesses.length > 0,
    positions: [],
    watchlist: [],
  };
}

function summaryWithDividends(summary: SummaryBeforeDividends): PendingReturnSummary {
  if (summary.status === 'none') return summary;
  const earnings = { ...summary.summary.earnings, dividends: moneyCents(0) };
  return { status: 'pending', summary: { ...summary.summary, earnings } };
}

function withDividends(saved: SaveBeforeDividends): GameState {
  return {
    ...saved,
    schemaVersion: SAVE_SCHEMA_VERSION,
    income: { ...saved.income, dividendEarningsCents: moneyCents(0) },
    returnSummary: summaryWithDividends(saved.returnSummary),
    dividends: [],
  };
}

const MIGRATIONS: readonly Migration[] = [
  { fromVersion: 1, upgrade: (raw) => withDividends(withTrading(saveSchemaV1.parse(raw))) },
  { fromVersion: 2, upgrade: (raw) => withDividends(withTrading(saveSchemaV2.parse(raw))) },
  { fromVersion: 3, upgrade: (raw) => withDividends(saveSchemaV3.parse(raw)) },
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
  const parsed = saveSchemaV4.safeParse(raw);
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
