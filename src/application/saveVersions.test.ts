import { readFileSync } from 'node:fs';

import { z } from 'zod';

import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars, quantityMicrounits } from '@/domain/money';

import { decodeSave, decodeSaveIn, encodeSave, SAVE_FORMAT, type SaveFormat } from './saveFormat';
import { saveSchema } from './saveSchemas';
import { currentState, startTestGame, startTestGameFromDocument } from './testGame';

const baselineFixture = readFileSync(
  new URL('fixtures/save-baseline.json', import.meta.url),
  'utf8',
);
const fixtureWallMs = 1_799_990_000_000;
const threeTaps = { id: 'batch-1', command: { type: 'TapBatch', taps: 3 } } as const;

const baselineDocument = (change: Record<string, unknown>) =>
  JSON.stringify({ ...(JSON.parse(baselineFixture) as object), ...change });

const BASELINE_STATE = {
  saveId: '4f6c2a9e-baseline',
  schemaVersion: 1,
  minReaderVersion: 1,
  economyVersion: 1,
  revision: 1842,
  cashCents: 1_208_925_819_614_629_174_706_176n,
  peakNetWorthCents: 1_208_925_819_614_629_174_956_176n,
  lifetimeTapEarningsCents: dollars('7315'),
  clock: { simulationMs: 86_400_000, lastWallCheckpointMs: fixtureWallMs },
  tap: { walletLevel: 7, totalAcceptedTaps: 48_211 },
  businesses: [
    {
      definitionId: 'vending',
      levels: { capacity: 3, quality: 1, efficiency: 0 },
      managerOwned: true,
      capitalizedSpendCents: dollars('1875'),
    },
  ],
  properties: [
    {
      definitionId: 'studio',
      levels: { renovation: 1, furnishings: 0, systems: 0, expansion: 0 },
      rented: true,
      upgradeSpendCents: dollars('400'),
    },
  ],
  income: {
    businessRemainders: { vending: 41_999 },
    businessEarningsCents: dollars('9123.45'),
    rentRemainders: { studio: 12 },
    rentEarningsCents: dollars('50'),
    dividendEarningsCents: dollars('1.60'),
  },
  unlockedTiers: [1, 2],
  returnSummary: { status: 'none' },
  market: { seed: '4f6c2a9e-baseline', tick: 1440, quotes: {}, candles: {} },
  tradingUnlocked: true,
  positions: [
    {
      instrumentId: 'wag',
      quantity: quantityMicrounits(12_500_000),
      remainingBasisCents: dollars('150'),
      realizedProfitCents: dollars('-2.50'),
    },
  ],
  dividendAccruals: [
    { instrumentId: 'wag', pendingCents: dollars('0.03'), entitlementNumerator: 900_000_000_000n },
  ],
  watchlist: ['prism'],
  reward: {
    boost: { status: 'active', grantId: 'grant-7', remainingMs: 41_250 },
    processedRewardIds: ['grant-6', 'grant-7'],
  },
  goals: { completed: [{ goalId: 'first_business', simulationMs: 3_600_000 }], pinnedGoalId: null },
  activity: {
    open: null,
    lifetime: {
      entries: 0,
      byKind: {
        earnings: 0,
        purchase: 0,
        sale: 0,
        upgrade: 0,
        rental: 0,
        trade: 0,
        dividend: 0,
        offline: 0,
      },
      spentCents: dollars('0'),
      proceedsCents: dollars('0'),
    },
  },
  tutorial: { completedSteps: ['tap', 'upgradeWallet', 'buyBusiness'], explanations: 'shown' },
  settings: { sound: 'on', haptics: 'on', reducedMotion: 'system', numberFormatting: 'compact' },
};

describe('the baseline save format', () => {
  it('opens a baseline save with balances, assets, cost basis, time and grant IDs intact (AC25)', () => {
    expect(currentState(baselineFixture)).toEqual(BASELINE_STATE);
  });

  it('writes every new save as version 1, readable by version 1 readers', () => {
    const fresh = freshGameState({ saveId: 'new', economyVersion: 1, wallMs: 0 });
    const written = JSON.parse(encodeSave(fresh)) as unknown;
    expect(written).toMatchObject({ schemaVersion: 1, minReaderVersion: 1 });
  });

  it('rejects a save missing its cash instead of defaulting it to zero', () => {
    const { cashCents: _cash, ...withoutCash } = JSON.parse(baselineFixture) as Record<
      string,
      unknown
    >;
    expect(decodeSave(JSON.stringify(withoutCash))).toEqual({ status: 'corrupt' });
  });

  it('still rejects a known field with the wrong type', () => {
    expect(decodeSave(baselineDocument({ watchlist: 'prism' }))).toEqual({ status: 'corrupt' });
  });
});

describe('an additive field', () => {
  const withThrowaway: SaveFormat = {
    ...SAVE_FORMAT,
    schema: saveSchema.extend({ throwawayIds: z.array(z.string()).default([]) }),
  };

  it('loads a baseline save with its neutral default and no version bump', () => {
    expect(decodeSaveIn(withThrowaway, baselineFixture)).toEqual({
      status: 'current',
      state: { ...BASELINE_STATE, throwawayIds: [] },
    });
  });

  it('keeps a stored value over the default', () => {
    const stored = baselineDocument({ throwawayIds: ['kept'] });
    expect(decodeSaveIn(withThrowaway, stored)).toMatchObject({
      status: 'current',
      state: { schemaVersion: 1, throwawayIds: ['kept'] },
    });
  });
});

describe('a save written by a newer build', () => {
  const futureFeature = { level: 3, ids: ['a', 'b'], unlocked: true };

  it('keeps fields this build does not know through a load and save', async () => {
    const newer = baselineDocument({ schemaVersion: 2, futureFeature });
    const session = await startTestGameFromDocument(newer, fixtureWallMs);
    await session.game.dispatch(threeTaps);
    expect(JSON.parse(session.saveDocument())).toMatchObject({
      schemaVersion: 2,
      minReaderVersion: 1,
      revision: 1843,
      futureFeature,
    });
  });

  it('stops safely when its minimum reader is newer than this build, keeping the save (AC23)', async () => {
    const first = await startTestGame();
    await first.game.dispatch(threeTaps);
    const newer = baselineDocument({ schemaVersion: 2, minReaderVersion: 2 });
    first.replaceSaveDocument(newer);
    expect(await first.reopen()).toEqual({ status: 'stopped', reason: 'UNSUPPORTED_SAVE_VERSION' });
    expect(first.saveDocument()).toBe(newer);
  });
});

function preBaseline(): string {
  const { minReaderVersion: _reader, ...older } = JSON.parse(baselineFixture) as Record<
    string,
    unknown
  >;
  return JSON.stringify({ ...older, schemaVersion: 7 });
}

describe('a save from before the baseline format', () => {
  it('starts a fresh game instead of reporting a damaged save', async () => {
    const { game } = await startTestGameFromDocument(preBaseline(), fixtureWallMs);
    const { notice, state } = game.getSnapshot();
    expect(notice).toEqual({ kind: 'none' });
    expect(state).toMatchObject({ saveId: 'test-id-1', revision: 0, schemaVersion: 1 });
    expect<bigint>(state.cashCents).toBe(dollars('0'));
  });

  it('keeps the old document as a diagnostic', async () => {
    const document = preBaseline();
    const session = await startTestGameFromDocument(document, fixtureWallMs);
    expect(await session.diagnostics()).toContainEqual(
      expect.objectContaining({ type: 'PRE_BASELINE_SAVE', document }),
    );
  });
});

const VERSION_2 = 2;

const bumpedFormat: SaveFormat = {
  readerVersion: VERSION_2,
  schema: saveSchema,
  migrations: [
    {
      fromVersion: 1,
      upgrade: (raw): GameState => ({
        ...saveSchema.parse(raw),
        schemaVersion: VERSION_2,
        minReaderVersion: VERSION_2,
        watchlist: [],
      }),
    },
  ],
};

describe('a breaking change', () => {
  it('bumps the version and runs the upgrade step on an older save', () => {
    expect(decodeSaveIn(bumpedFormat, baselineFixture)).toEqual({
      status: 'migrated',
      fromVersion: 1,
      state: { ...BASELINE_STATE, schemaVersion: 2, minReaderVersion: 2, watchlist: [] },
    });
  });

  it('backs up the original before saving the upgrade', async () => {
    const hooks = { saveFormat: bumpedFormat };
    const migrated = await startTestGameFromDocument(baselineFixture, fixtureWallMs, hooks);
    expect(JSON.parse(migrated.saveDocument())).toMatchObject({ schemaVersion: 2, revision: 1842 });
    migrated.replaceSaveDocument('not json');
    const { game } = await migrated.restart({ saveFormat: SAVE_FORMAT });
    expect(game.getSnapshot().notice).toEqual({ kind: 'restoredFromBackup' });
    expect(game.getSnapshot().state).toMatchObject({ schemaVersion: 1, revision: 1842 });
  });

  it('is refused by an older reader once upgraded', async () => {
    const migrated = await startTestGameFromDocument(baselineFixture, fixtureWallMs, {
      saveFormat: bumpedFormat,
    });
    expect(await migrated.reopen({ saveFormat: SAVE_FORMAT })).toEqual({
      status: 'stopped',
      reason: 'UNSUPPORTED_SAVE_VERSION',
    });
  });
});
