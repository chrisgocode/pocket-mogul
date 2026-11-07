import { readFileSync } from 'node:fs';

import { z } from 'zod';

import { freshAdSchedule } from '@/domain/adSchedule';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars, quantityMicrounits } from '@/domain/money';

import { decodeSave, decodeSaveIn, encodeSave, SAVE_FORMAT, type SaveFormat } from './saveFormat';
import { fromSaveDocument } from './saveDocument';
import { saveDocumentSchema, saveSchema } from './saveSchemas';
import { currentState, startTestGame, startTestGameFromDocument } from './testGame';

const baselineFixture = readFileSync(
  new URL('fixtures/save-baseline.json', import.meta.url),
  'utf8',
);
const versionOneFixture = readFileSync(new URL('fixtures/save-v1.json', import.meta.url), 'utf8');
const fixtureWallMs = 1_799_990_000_000;
const threeTaps = { id: 'batch-1', command: { type: 'TapBatch', taps: 3 } } as const;

const baselineDocument = (change: Record<string, unknown>) =>
  JSON.stringify({ ...(JSON.parse(baselineFixture) as object), ...change });

const BASELINE_STATE = {
  saveId: '4f6c2a9e-baseline',
  schemaVersion: 2,
  minReaderVersion: 2,
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
      stage: 1,
      units: 2,
      priceLevel: 'premium',
      levels: { quality: 1, efficiency: 0 },
      payoutPercent: 70,
      treasuryCents: dollars('123.45'),
      profitRemainder: 41_999,
      payoutRemainder: 30,
      status: 'open',
      purchasedDay: 6,
      capitalizedSpendCents: dollars('412.50'),
      staff: { operations: 0, sales: 0, manager: 0 },
      insurance: { equipment: 'none', liability: 'none', supply: 'none' },
      incident: { status: 'none' },
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
        improvement: 0,
        treasury: 0,
        closure: 0,
        incident: 0,
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
  adSchedule: freshAdSchedule(),
};

describe('the baseline save format', () => {
  it('opens a baseline save with balances, assets, cost basis, time and grant IDs intact (AC25)', () => {
    expect(currentState(baselineFixture)).toEqual(BASELINE_STATE);
  });

  it('writes every new save as version 2, readable by version 2 readers', () => {
    const fresh = freshGameState({ saveId: 'new', economyVersion: 1, wallMs: 0 });
    const written = JSON.parse(encodeSave(fresh)) as unknown;
    expect(written).toMatchObject({ schemaVersion: 2, minReaderVersion: 2 });
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

describe('the automatic ad schedule field', () => {
  it('loads the baseline save with a fresh schedule and no version bump', () => {
    expect(JSON.parse(baselineFixture)).not.toHaveProperty('adSchedule');
    expect(currentState(baselineFixture)).toMatchObject({
      schemaVersion: 2,
      adSchedule: {
        foregroundMs: 0,
        sinceFullScreenAdMs: 0,
        interstitials: { dayKey: '', count: 0 },
        lastRewardedWallMs: null,
        sessions: 0,
        lastAppOpenWallMs: null,
      },
    });
  });

  it('round-trips a stored schedule', () => {
    const adSchedule = {
      foregroundMs: 600_000,
      sinceFullScreenAdMs: 12_000,
      interstitials: { dayKey: '2026-11-7', count: 4 },
      lastRewardedWallMs: fixtureWallMs,
      sessions: 3,
      lastAppOpenWallMs: null,
    };
    expect(currentState(encodeSave(currentState(baselineDocument({ adSchedule }))))).toMatchObject({
      adSchedule,
    });
  });
});

describe('an additive field', () => {
  const withThrowaway: SaveFormat = {
    ...SAVE_FORMAT,
    schema: saveDocumentSchema
      .extend({ throwawayIds: z.array(z.string()).default([]) })
      .transform(fromSaveDocument),
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
      state: { schemaVersion: 2, throwawayIds: ['kept'] },
    });
  });
});

describe('a save written by a newer build', () => {
  const futureFeature = { level: 3, ids: ['a', 'b'], unlocked: true };

  it('keeps fields this build does not know through a load and save', async () => {
    const newer = baselineDocument({ schemaVersion: 3, futureFeature });
    const session = await startTestGameFromDocument(newer, fixtureWallMs);
    await session.game.dispatch(threeTaps);
    expect(JSON.parse(session.saveDocument())).toMatchObject({
      schemaVersion: 3,
      minReaderVersion: 2,
      revision: 1843,
      futureFeature,
    });
  });

  it('stops safely when its minimum reader is newer than this build, keeping the save (AC23)', async () => {
    const first = await startTestGame();
    await first.game.dispatch(threeTaps);
    const newer = baselineDocument({ schemaVersion: 3, minReaderVersion: 3 });
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
    expect(state).toMatchObject({ saveId: 'test-id-1', revision: 0, schemaVersion: 2 });
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

describe('a version 1 save from before deep businesses (AC44)', () => {
  it('opens as a fresh game', async () => {
    const { game } = await startTestGameFromDocument(versionOneFixture, fixtureWallMs);
    const { notice, state } = game.getSnapshot();
    expect(notice).toEqual({ kind: 'none' });
    expect(state).toMatchObject({ saveId: 'test-id-1', revision: 0, schemaVersion: 2 });
    expect(state.businesses).toEqual([]);
    expect<bigint>(state.cashCents).toBe(dollars('0'));
  });

  it('keeps the old document as a diagnostic', async () => {
    const session = await startTestGameFromDocument(versionOneFixture, fixtureWallMs);
    expect(await session.diagnostics()).toContainEqual(
      expect.objectContaining({ type: 'RETIRED_FORMAT_SAVE', document: versionOneFixture }),
    );
  });
});

const VERSION_3 = 3;

const bumpedFormat: SaveFormat = {
  ...SAVE_FORMAT,
  readerVersion: VERSION_3,
  migrations: [
    {
      fromVersion: 2,
      upgrade: (raw): GameState => ({
        ...saveSchema.parse(raw),
        schemaVersion: VERSION_3,
        minReaderVersion: VERSION_3,
        watchlist: [],
      }),
    },
  ],
};

describe('a breaking change', () => {
  it('bumps the version and runs the upgrade step on an older save', () => {
    expect(decodeSaveIn(bumpedFormat, baselineFixture)).toEqual({
      status: 'migrated',
      fromVersion: 2,
      state: { ...BASELINE_STATE, schemaVersion: 3, minReaderVersion: 3, watchlist: [] },
    });
  });

  it('backs up the original before saving the upgrade', async () => {
    const hooks = { saveFormat: bumpedFormat };
    const migrated = await startTestGameFromDocument(baselineFixture, fixtureWallMs, hooks);
    expect(JSON.parse(migrated.saveDocument())).toMatchObject({ schemaVersion: 3, revision: 1842 });
    migrated.replaceSaveDocument('not json');
    const { game } = await migrated.restart({ saveFormat: SAVE_FORMAT });
    expect(game.getSnapshot().notice).toEqual({ kind: 'restoredFromBackup' });
    expect(game.getSnapshot().state).toMatchObject({ schemaVersion: 2, revision: 1842 });
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
