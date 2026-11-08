import { CURRENT_ECONOMY_VERSION } from '@/content';
import { ownedBusiness } from '@/domain/testRules';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import { startTestGame, startTestGameFrom, startObservedTestGame } from './testGame';
import { scriptedAds } from './scriptedAds';

const HOUR_MS = 3_600_000;
const SECOND_MS = 1000;

async function failedReturn() {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'recovery', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    businesses: [ownedBusiness('vending', { payoutPercent: 100 })],
  });
  await session.game.pause();
  session.clock.advance(8 * HOUR_MS);
  session.faults.failWrites = true;
  await session.game.resume();
  return session;
}

describe('recovering automatic saves', () => {
  it('recovers offline earnings before a checkpoint can replace the baseline', async () => {
    const session = await failedReturn();
    expect(await session.game.checkpoint()).toEqual({ ok: false, error: 'SAVE_FAILED' });
    session.faults.failWrites = false;
    await session.game.checkpoint();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('4800'));
    const restarted = await session.restart();
    expect(restarted.game.getSnapshot().state.cashCents).toBe(dollars('4800'));
  });

  it('preserves foreground earnings accrued while an offline save is pending', async () => {
    const session = await failedReturn();
    session.clock.advance(60 * SECOND_MS);
    await session.game.flushTaps();
    session.faults.failWrites = false;
    await session.game.checkpoint();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('4810'));
  });

  it('preserves foreground time after a second resume during an outage', async () => {
    const session = await failedReturn();
    await session.game.pause();
    session.clock.advance(60 * SECOND_MS);
    await session.game.resume();
    session.clock.advance(60 * SECOND_MS);
    session.faults.failWrites = false;
    await session.game.checkpoint();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('4820'));
  });

  it('blocks reset until recovery succeeds and leaves no income to replay after reset', async () => {
    const session = await failedReturn();
    expect(await session.game.resetSave('reset')).toEqual({ ok: false, error: 'SAVE_FAILED' });
    session.faults.failWrites = false;
    expect((await session.game.resetSave('reset')).ok).toBe(true);
    await session.game.checkpoint();
    const restarted = await session.restart();
    expect(restarted.game.getSnapshot().state.cashCents).toBe(dollars('0'));
    expect(restarted.game.getSnapshot().state.businesses).toEqual([]);
  });

  it('counts overlapping reward and activation retry time only once', async () => {
    const session = await failedReturn();
    session.clock.advance(60 * SECOND_MS);
    await session.game.dispatch({
      id: 'earned-during-outage',
      command: { type: 'RecordAdReward', presentationId: 'earned-during-outage' },
    });
    await session.game.dispatch({
      id: 'activate-during-outage',
      command: { type: 'ActivateBoost' },
    });
    session.clock.advance(60 * SECOND_MS);
    session.faults.failWrites = false;
    await session.game.checkpoint();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('4820'));
    expect(session.game.getSnapshot().unsavedElapsedMs).toBe(0);
    expect(session.game.getSnapshot().unsavedBoostMs).toBe(0);
  });

  it('settles the absence before spending the resulting cash', async () => {
    const session = await failedReturn();
    session.faults.failWrites = false;
    const result = await session.game.dispatch({
      id: 'wallet-after-return',
      command: { type: 'UpgradeWallet', fromLevel: 0 },
    });
    expect(result.ok).toBe(true);
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('4700'));
  });
});

describe('recovering ad rewards', () => {
  it('retries an earned reward and activates it once writes recover', async () => {
    const session = await startTestGame();
    session.faults.failWrites = true;
    await session.game.pressTapBoost();
    await session.game.flushTaps();
    expect(session.game.getSnapshot().state.reward.boost).toEqual({ status: 'none' });
    session.faults.failWrites = false;
    await session.game.checkpoint();
    expect(session.game.getSnapshot().state.reward.boost).toMatchObject({
      status: 'active',
      remainingMs: 60 * SECOND_MS,
    });
    expect(session.game.getSnapshot().state.reward.processedRewardIds).toHaveLength(1);
    await session.game.checkpoint();
    expect(session.game.getSnapshot().state.reward.processedRewardIds).toHaveLength(1);
  });

  it('retries a pending activation without requiring a relaunch', async () => {
    const session = await startObservedTestGame({ ads: scriptedAds({ scripts: ['held'] }) });
    await session.game.pressTapBoost();
    session.ads.emit({ type: 'earnedReward' });
    await session.game.flushTaps();
    session.faults.failWrites = true;
    session.ads.emit({ type: 'closed' });
    await session.game.flushTaps();
    expect(session.game.getSnapshot().state.reward.boost).toMatchObject({ status: 'pending' });
    session.faults.failWrites = false;
    await session.game.checkpoint();
    expect(session.game.getSnapshot().state.reward.boost).toMatchObject({ status: 'active' });
  });
});
