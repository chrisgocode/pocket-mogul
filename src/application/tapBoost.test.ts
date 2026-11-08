import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import type { Boost } from '@/domain/boost';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import { scriptedAds, type AdScript } from './scriptedAds';
import { selectTapCard } from './tapCardView';
import { selectTapBoost } from './tapBoostView';
import { startTestGame, startTestGameFrom, startObservedTestGame } from './testGame';

const BOOST_MS = 60_000;

async function boostAfter(script: AdScript) {
  const session = await startObservedTestGame({ ads: scriptedAds({ scripts: [script] }) });
  await session.game.pressTapBoost();
  await session.game.flushTaps();
  return session;
}

const boostOf = (session: { game: { getSnapshot: () => { state: GameState } } }): Boost =>
  session.game.getSnapshot().state.reward.boost;

function savedWithBoost(boost: Boost, overrides: Partial<GameState> = {}): GameState {
  return {
    ...freshGameState({
      saveId: 'boosted',
      economyVersion: CURRENT_ECONOMY_VERSION,
      wallMs: 1_800_000_000_000,
    }),
    reward: { boost, processedRewardIds: [] },
    ...overrides,
  };
}

describe('starting a Tap Boost', () => {
  it('never starts a boost without the button press (AC35)', async () => {
    const { game, clock, ads } = await startTestGame();
    clock.advance(10 * BOOST_MS);
    await game.checkpoint();
    expect(ads.shows()).toBe(0);
    expect(boostOf({ game })).toEqual({ status: 'none' });
    expect(selectTapBoost(game.getSnapshot(), getContent())).toEqual({
      status: 'ready',
      multiplier: 5,
      durationSeconds: 60,
    });
  });

  it('starts one 60-second 5x boost after the press and an earned reward (AC35)', async () => {
    const session = await boostAfter('success');
    expect(boostOf(session)).toMatchObject({ status: 'active', remainingMs: BOOST_MS });
    session.game.tap();
    await session.game.flushTaps();
    expect<bigint>(session.game.getSnapshot().state.cashCents).toBe(dollars('5'));
  });

  it('gives exactly one boost when the reward callback arrives twice (AC19)', async () => {
    const session = await boostAfter('duplicateReward');
    expect(boostOf(session)).toMatchObject({ status: 'active', remainingMs: BOOST_MS });
    expect(session.game.getSnapshot().state.reward.processedRewardIds).toHaveLength(1);
  });

  it('gives one boost when the reward arrives after the close', async () => {
    const session = await boostAfter('rewardAfterClose');
    expect(boostOf(session)).toMatchObject({ status: 'active', remainingMs: BOOST_MS });
  });

  it('grants nothing when the ad closes without a reward, and play continues (AC20)', async () => {
    const session = await boostAfter('closeWithoutReward');
    expect(boostOf(session)).toEqual({ status: 'none' });
    session.game.tap();
    await session.game.flushTaps();
    expect<bigint>(session.game.getSnapshot().state.cashCents).toBe(dollars('1'));
    expect(session.game.getSnapshot().tapBoostAd).toBe('ready');
  });

  it('grants nothing when the ad fails to show, and loads another', async () => {
    const session = await boostAfter('showFails');
    expect(boostOf(session)).toEqual({ status: 'none' });
    expect(session.game.getSnapshot().tapBoostAd).toBe('ready');
  });

  it('activates a grant saved before a crash on the next launch without replaying the ad', async () => {
    const crashed = await boostAfter('crashAfterReward');
    expect(boostOf(crashed).status).toBe('pending');
    const relaunched = await crashed.restart({ ads: scriptedAds() });
    expect(boostOf(relaunched)).toMatchObject({ status: 'active', remainingMs: BOOST_MS });
    expect(relaunched.ads.shows()).toBe(0);
  });
});

describe('the Tap Boost button', () => {
  it('does not start another ad while a boost runs', async () => {
    const session = await boostAfter('success');
    await session.game.pressTapBoost();
    expect(session.ads.shows()).toBe(1);
    expect(selectTapBoost(session.game.getSnapshot(), getContent())).toEqual({
      status: 'active',
      multiplier: 5,
      remainingSeconds: 60,
    });
  });

  it('does not start a second ad while one is showing', async () => {
    const session = await boostAfter('held');
    await session.game.pressTapBoost();
    expect(session.ads.shows()).toBe(1);
    expect(session.game.getSnapshot().tapBoostAd).toBe('showing');
  });

  it('reports no fill, and retries the load when pressed', async () => {
    const ads = scriptedAds({ fill: 'noFill' });
    const { game } = await startObservedTestGame({ ads });
    expect(game.getSnapshot().tapBoostAd).toBe('unavailable');
    ads.fill('fill');
    await game.pressTapBoost();
    expect(ads.shows()).toBe(0);
    expect(game.getSnapshot().tapBoostAd).toBe('ready');
  });
});

describe('boost time', () => {
  it('counts only foreground time and survives a restart (AC21)', async () => {
    const active: Boost = { status: 'active', grantId: 'show-1', remainingMs: BOOST_MS };
    const session = await startTestGameFrom(savedWithBoost(active));
    session.clock.advance(20_000);
    await session.game.pause();
    session.clock.advance(3_600_000);
    await session.game.resume();
    expect(boostOf(session)).toMatchObject({ remainingMs: 40_000 });
    const relaunched = await session.restart({ awayMs: 3_600_000 });
    expect(boostOf(relaunched)).toMatchObject({ remainingMs: 40_000 });
    relaunched.clock.advance(40_000);
    await relaunched.game.checkpoint();
    expect(boostOf(relaunched)).toEqual({ status: 'none' });
  });

  it('pauses while the rewarded ad covers the game', async () => {
    const session = await boostAfter('held');
    session.clock.advance(30_000);
    session.ads.emit({ type: 'earnedReward' });
    session.ads.emit({ type: 'closed' });
    await session.game.flushTaps();
    session.clock.advance(10_000);
    await session.game.checkpoint();
    expect(boostOf(session)).toMatchObject({ remainingMs: 50_000 });
  });

  it('ignores the app lifecycle while an ad covers the game', async () => {
    const session = await boostAfter('held');
    const { revision } = session.game.getSnapshot().state;
    await session.game.pause();
    session.clock.advance(5_000);
    await session.game.resume();
    expect(session.game.getSnapshot().state.revision).toBe(revision);
    expect(session.game.getSnapshot().state.returnSummary).toEqual({ status: 'none' });
  });
});

describe('taps at the end of a boost', () => {
  const almostOver: Boost = { status: 'active', grantId: 'show-1', remainingMs: 100 };

  it('keeps boosted and ordinary taps in separate batches with no extra boosted tap (AC22)', async () => {
    const { game, clock } = await startTestGameFrom(savedWithBoost(almostOver));
    game.tap();
    clock.advance(100);
    game.tap();
    await game.flushTaps();
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('6'));
    expect(game.getSnapshot().state.revision).toBe(2);
  });

  it('pays boosted taps at the old level and later taps at the new one (AC22)', async () => {
    const funded = savedWithBoost(almostOver, { cashCents: dollars('100') });
    const { game, clock } = await startTestGameFrom(funded);
    game.tap();
    game.tap();
    clock.advance(100);
    await game.dispatch({ id: 'upgrade', command: { type: 'UpgradeWallet', fromLevel: 0 } });
    game.tap();
    await game.flushTaps();
    expect(game.getSnapshot().state.tap.walletLevel).toBe(1);
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('11.50'));
    expect(boostOf({ game })).toEqual({ status: 'none' });
  });

  it('pays a batch marked boosted at the ordinary rate when no boost was running', async () => {
    const { game } = await startTestGame();
    await game.dispatch({ id: 'taps', command: { type: 'TapBatch', taps: 2, boosted: true } });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('2'));
  });
});

describe('what Home shows during a boost', () => {
  const active: Boost = { status: 'active', grantId: 'show-1', remainingMs: BOOST_MS };

  it('quotes the boosted payout and counts pending boosted taps at 5x', async () => {
    const { game } = await startTestGameFrom(savedWithBoost(active));
    game.tap();
    game.tap();
    const card = selectTapCard(game.getSnapshot(), getContent());
    expect(card).toMatchObject({ perTapCents: dollars('5'), boosted: true });
    expect<bigint>(card.cashCents).toBe(dollars('10'));
  });

  it('counts the countdown down between saves', async () => {
    const { game, clock } = await startTestGameFrom(savedWithBoost(active));
    clock.advance(15_500);
    expect(selectTapBoost(game.getSnapshot(), getContent())).toMatchObject({
      status: 'active',
      remainingSeconds: 45,
    });
  });
});
