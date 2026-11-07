import { readFileSync } from 'node:fs';

import { getContent } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import {
  startTestGame,
  startTestGameFrom,
  startTestGameFromDocument,
  withBusinessRevenue,
} from './testGame';

const threeTaps = { id: 'batch-1', command: { type: 'TapBatch', taps: 3 } } as const;

describe('a save from a newer schema', () => {
  it('stops with UNSUPPORTED_SAVE_VERSION and leaves the save untouched (AC23)', async () => {
    const first = await startTestGame();
    await first.game.dispatch(threeTaps);
    const newer = JSON.stringify({ ...JSON.parse(first.saveDocument()), schemaVersion: 99 });
    first.replaceSaveDocument(newer);
    const reopened = await first.reopen();
    expect(reopened).toEqual({ status: 'stopped', reason: 'UNSUPPORTED_SAVE_VERSION' });
    expect(first.saveDocument()).toBe(newer);
  });

  it('stops on an economy version this build does not bundle', async () => {
    const first = await startTestGame();
    const unknown = JSON.stringify({ ...JSON.parse(first.saveDocument()), economyVersion: 99 });
    first.replaceSaveDocument(unknown);
    expect(await first.reopen()).toEqual({ status: 'stopped', reason: 'UNSUPPORTED_SAVE_VERSION' });
    expect(first.saveDocument()).toBe(unknown);
  });
});

describe('a corrupt latest snapshot', () => {
  const BACKUP_DUE_MS = 60_000;

  it('restores the newest valid backup and shows a recovery notice (AC23)', async () => {
    const first = await startTestGame();
    await first.game.dispatch(threeTaps);
    first.clock.advance(BACKUP_DUE_MS);
    await first.game.checkpoint();
    await first.game.dispatch({ id: 'batch-2', command: { type: 'TapBatch', taps: 2 } });
    first.replaceSaveDocument('{"saveId": "trunc');
    const { game } = await first.restart();
    expect(game.getSnapshot().notice).toEqual({ kind: 'restoredFromBackup' });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('3'));
  });

  it('keeps the restored save and the damaged document after the notice is dismissed', async () => {
    const first = await startTestGame();
    await first.game.dispatch(threeTaps);
    first.clock.advance(BACKUP_DUE_MS);
    await first.game.checkpoint();
    first.replaceSaveDocument('not json');
    const restored = await first.restart();
    restored.game.dismissNotice();
    expect(restored.game.getSnapshot().notice).toEqual({ kind: 'none' });
    const again = await restored.restart();
    expect(again.game.getSnapshot().notice).toEqual({ kind: 'none' });
    expect<bigint>(again.game.getSnapshot().state.cashCents).toBe(dollars('3'));
    expect(await again.diagnostics()).toContainEqual(
      expect.objectContaining({ type: 'DAMAGED_SAVE', document: 'not json' }),
    );
  });

  it('restores a backup instead of starting over when the snapshot row is missing', async () => {
    const first = await startTestGame();
    await first.game.dispatch(threeTaps);
    first.clock.advance(BACKUP_DUE_MS);
    await first.game.checkpoint();
    first.deleteSaveDocument();
    const { game } = await first.restart();
    expect(game.getSnapshot().notice).toEqual({ kind: 'restoredFromBackup' });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('3'));
  });

  it('stops without touching the save when no backup is valid (AC23)', async () => {
    const first = await startTestGame();
    first.replaceSaveDocument('not json');
    first.corruptBackups();
    expect(await first.reopen()).toEqual({ status: 'stopped', reason: 'DAMAGED_SAVE' });
    expect(first.saveDocument()).toBe('not json');
  });
});

describe('a save from the previous schema', () => {
  const v1Fixture = readFileSync(new URL('fixtures/save-v1.json', import.meta.url), 'utf8');
  const fixtureWallMs = 1_799_990_000_000;

  it('migrates balances, assets, cost basis and time intact (AC25)', async () => {
    const { game } = await startTestGameFromDocument(v1Fixture, fixtureWallMs);
    expect(game.getSnapshot().state).toEqual({
      saveId: '4f6c2a9e-legacy',
      schemaVersion: 5,
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
        {
          definitionId: 'food_cart',
          levels: { capacity: 0, quality: 0, efficiency: 0 },
          managerOwned: false,
          capitalizedSpendCents: dollars('2500'),
        },
      ],
      properties: [
        {
          definitionId: 'studio',
          levels: { renovation: 0, furnishings: 0, systems: 0, expansion: 0 },
          rented: true,
          upgradeSpendCents: dollars('0'),
        },
      ],
      income: {
        businessRemainders: { vending: 41_999 },
        businessEarningsCents: dollars('9123.45'),
        rentRemainders: {},
        rentEarningsCents: dollars('0'),
        dividendEarningsCents: dollars('0'),
      },
      unlockedTiers: [1, 2],
      returnSummary: {
        status: 'pending',
        summary: {
          awayMs: 7_200_000,
          creditedMs: 7_200_000,
          earnings: { businesses: dollars('864'), rent: dollars('0'), dividends: dollars('0') },
        },
      },
      market: { seed: '4f6c2a9e-legacy', tick: 1440, quotes: {}, candles: {} },
      tradingUnlocked: true,
      positions: [],
      dividendAccruals: [],
      watchlist: [],
      reward: { boost: { status: 'none' }, processedRewardIds: [] },
    });
  });

  it('saves the migrated snapshot so the next launch opens it as current', async () => {
    const migrated = await startTestGameFromDocument(v1Fixture, fixtureWallMs);
    expect(JSON.parse(migrated.saveDocument())).toMatchObject({ schemaVersion: 5, revision: 1842 });
    const again = await migrated.restart();
    expect(again.game.getSnapshot().state.revision).toBe(1842);
  });

  it('backs up the original before migrating, so a damaged result restores it', async () => {
    const migrated = await startTestGameFromDocument(v1Fixture, fixtureWallMs);
    migrated.replaceSaveDocument('not json');
    const { game } = await migrated.restart();
    expect(game.getSnapshot().notice).toEqual({ kind: 'restoredFromBackup' });
    expect(game.getSnapshot().state).toMatchObject({ schemaVersion: 5, revision: 1842 });
  });
});

describe('a write failure during a purchase', () => {
  const buyVending = {
    id: 'buy-1',
    command: { type: 'BuyBusiness', businessId: 'vending' },
  } as const;
  const funded = {
    ...freshGameState({ saveId: 'buyer', economyVersion: 1, wallMs: 1_800_000_000_000 }),
    cashCents: dollars('1000'),
  };

  it('rolls back the snapshot written before the failing receipt (AC27)', async () => {
    const session = await startTestGameFrom(funded);
    session.faults.failWritesMatching = /command_receipts/;
    expect(await session.game.dispatch(buyVending)).toEqual({ ok: false, error: 'SAVE_FAILED' });
    expect(session.game.getSnapshot().state).toEqual(funded);
    const restarted = await session.restart();
    expect(restarted.game.getSnapshot().state).toEqual(funded);
  });

  it('applies the same purchase exactly once when retried after the failure (AC27)', async () => {
    const session = await startTestGameFrom(funded);
    session.faults.failWritesMatching = /command_receipts/;
    await session.game.dispatch(buyVending);
    session.faults.failWritesMatching = undefined;
    expect(await session.game.dispatch(buyVending)).toMatchObject({ ok: true });
    const restarted = await session.restart();
    expect<bigint>(restarted.game.getSnapshot().state.cashCents).toBe(dollars('750'));
    expect(restarted.game.getSnapshot().state.businesses).toHaveLength(1);
  });
});

describe('an economy update while away', () => {
  const HOUR_MS = 3_600_000;
  const economyV1 = getContent();
  const economyV2 = withBusinessRevenue(economyV1, {
    economyVersion: 2,
    businessId: 'vending',
    revenuePerMinute: dollars('24'),
  });
  const withVending = {
    ...freshGameState({ saveId: 'owner', economyVersion: 1, wallMs: 1_800_000_000_000 }),
    businesses: [
      {
        definitionId: 'vending',
        levels: { capacity: 0, quality: 0, efficiency: 0 },
        managerOwned: false,
        capitalizedSpendCents: dollars('250'),
      },
    ],
  };
  const update = { content: economyV2, pastContent: [economyV1] };

  it('settles the absence at the old rate before the new one applies (AC30)', async () => {
    const left = await startTestGameFrom(withVending);
    const back = await left.restart({ awayMs: HOUR_MS, ...update });
    expect<bigint>(back.game.getSnapshot().state.cashCents).toBe(dollars('600'));
    expect(back.game.getSnapshot().state.economyVersion).toBe(2);
  });

  it('pays the new rate only for time after the update (AC30)', async () => {
    const left = await startTestGameFrom(withVending);
    const back = await left.restart({ awayMs: HOUR_MS, ...update });
    back.clock.advance(60_000);
    await back.game.checkpoint();
    expect<bigint>(back.game.getSnapshot().state.cashCents).toBe(dollars('620'));
  });

  it('switches economy even when no time passed, and keeps the switch after a restart', async () => {
    const left = await startTestGameFrom(withVending);
    const back = await left.restart(update);
    const again = await back.restart(update);
    expect(again.game.getSnapshot().state.economyVersion).toBe(2);
    expect(again.game.getSnapshot().state.businesses).toEqual(withVending.businesses);
  });
});

describe('command receipts over time', () => {
  const DAY_MS = 86_400_000;

  it('still recognises a repeated command 29 days later', async () => {
    const first = await startTestGame();
    const recorded = await first.game.dispatch(threeTaps);
    const later = await first.restart({ awayMs: 29 * DAY_MS });
    expect(await later.game.dispatch(threeTaps)).toEqual(recorded);
  });

  it('prunes receipts older than 30 days on launch', async () => {
    const first = await startTestGame();
    await first.game.dispatch(threeTaps);
    const later = await first.restart({ awayMs: 31 * DAY_MS });
    expect(later.receiptIds()).not.toContain('batch-1');
    expect(later.receiptIds()).toHaveLength(1);
  });
});

describe('resetting the save', () => {
  it('replaces the save with a fresh one that survives a restart', async () => {
    const first = await startTestGame();
    await first.game.dispatch(threeTaps);
    expect(await first.game.resetSave('reset-1')).toMatchObject({ ok: true });
    const fresh = first.game.getSnapshot().state;
    expect<bigint>(fresh.cashCents).toBe(dollars('0'));
    expect(fresh.tap.totalAcceptedTaps).toBe(0);
    expect(fresh.saveId).not.toBe('test-id-1');
    const restarted = await first.restart();
    expect(restarted.game.getSnapshot().state).toEqual(fresh);
  });

  it('does not reset again when the same request repeats', async () => {
    const { game } = await startTestGame();
    await game.resetSave('reset-1');
    await game.dispatch(threeTaps);
    await game.resetSave('reset-1');
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('3'));
  });

  it('keeps the save when the reset cannot be written', async () => {
    const first = await startTestGame();
    await first.game.dispatch(threeTaps);
    first.faults.failWrites = true;
    expect(await first.game.resetSave('reset-1')).toEqual({ ok: false, error: 'SAVE_FAILED' });
    first.faults.failWrites = false;
    expect<bigint>(first.game.getSnapshot().state.cashCents).toBe(dollars('3'));
    const restarted = await first.restart();
    expect<bigint>(restarted.game.getSnapshot().state.cashCents).toBe(dollars('3'));
  });

  it("drops the old save's market history", async () => {
    const { game, clock } = await startTestGame();
    clock.advance(3 * 60_000);
    await game.checkpoint();
    expect((await game.readMarketHistory('wag')).minutes).not.toHaveLength(0);
    await game.resetSave('reset-1');
    expect(await game.readMarketHistory('wag')).toEqual({ minutes: [], hours: [] });
  });

  it('drops the old backups so a later recovery cannot bring the old save back', async () => {
    const first = await startTestGame();
    await first.game.dispatch(threeTaps);
    first.clock.advance(60_000);
    await first.game.checkpoint();
    await first.game.resetSave('reset-1');
    first.replaceSaveDocument('not json');
    const { game } = await first.restart();
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('0'));
  });
});
