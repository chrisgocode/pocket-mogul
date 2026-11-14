import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import { applyClaimAdReward } from '@/domain/adRewardEffects';
import type { AdOffer } from '@/domain/adRewards';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import { adOfferText, selectAdOffer, selectBriefcaseCents } from './adOfferView';
import { selectCollection } from './collectionView';
import { adRewardEconomy } from './economy';
import { selectReturnSummary } from './returnSummaryView';
import { selectRushDay } from './rushDayView';
import { scriptedAds } from './scriptedAds';
import { taxReturnOwner } from './taxTesting';
import { startTestGameFrom, withoutIncidents, type TestGame } from './testGame';

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

const calm = { content: withoutIncidents(getContent()) };

const FRESH = freshGameState({
  saveId: 'ad-rewards',
  economyVersion: CURRENT_ECONOMY_VERSION,
  wallMs: 0,
});

const owner = (change: Partial<OwnedBusiness> = {}, state: Partial<GameState> = {}): GameState => ({
  ...FRESH,
  businesses: [ownedBusiness('vending', change)],
  ...state,
});

const stateOf = (session: TestGame) => session.game.getSnapshot().state;
const cash = (session: TestGame) => stateOf(session).cashCents;
const vending = (session: TestGame) => stateOf(session).businesses[0];

async function watch(session: TestGame, offer: AdOffer): Promise<void> {
  await session.game.watchAd(offer);
  await session.game.flushTaps();
}

const offerOf = (session: TestGame, offer: AdOffer) =>
  selectAdOffer(session.game.getSnapshot(), { content: getContent(), offer });

const lotIds = (session: TestGame) =>
  selectCollection(session.game.getSnapshot(), getContent()).lots.map((lot) => lot.piece.id);

const DOUBLE: AdOffer = { kind: 'double_offline' };
const BRIEFCASE: AdOffer = { kind: 'briefcase' };
const RUSH: AdOffer = { kind: 'rush_day', businessId: 'vending' };
const REDRAW: AdOffer = { kind: 'redraw_lots' };

describe('double offline earnings (#160)', () => {
  it('doubles the earnings on the return summary once, after a completed ad', async () => {
    const left = await startTestGameFrom(owner(), calm);
    const back = await left.restart({ awayMs: 10 * HOUR_MS });
    expect<bigint>(cash(back)).toBe(dollars('2400'));
    await watch(back, DOUBLE);
    expect<bigint>(cash(back)).toBe(dollars('4800'));
    expect(selectReturnSummary(stateOf(back), getContent())).toMatchObject({
      totalCents: dollars('2400'),
      adBonusCents: dollars('2400'),
    });
    expect(offerOf(back, DOUBLE)).toEqual({ status: 'hidden' });
    await watch(back, DOUBLE);
    expect(back.ads.shows()).toBe(1);
    expect<bigint>(cash(back)).toBe(dollars('4800'));
  });

  it('grants nothing when the ad is closed early or the summary is dismissed', async () => {
    const left = await startTestGameFrom(owner(), calm);
    const back = await left.restart({
      awayMs: 10 * HOUR_MS,
      ads: scriptedAds({ scripts: ['closeWithoutReward'] }),
    });
    await watch(back, DOUBLE);
    expect<bigint>(cash(back)).toBe(dollars('2400'));
    await back.game.dispatch({ id: 'seen', command: { type: 'AcknowledgeReturnSummary' } });
    await watch(back, DOUBLE);
    expect(back.ads.shows()).toBe(1);
    expect<bigint>(cash(back)).toBe(dollars('2400'));
  });

  it('says so when no ad is available and grants nothing', async () => {
    const left = await startTestGameFrom(owner(), calm);
    const back = await left.restart({
      awayMs: 10 * HOUR_MS,
      ads: scriptedAds({ fill: 'noFill' }),
    });
    const view = offerOf(back, DOUBLE);
    expect(view).toEqual({ status: 'unavailable', daily: undefined });
    expect(adOfferText({ status: 'unavailable', daily: undefined }, 'double')).toEqual({
      buttonLabel: 'No ad available · Try again',
      note: undefined,
      enabled: true,
    });
    await watch(back, DOUBLE);
    expect<bigint>(cash(back)).toBe(dollars('2400'));
  });

  it('offers a new double on the next return', async () => {
    const left = await startTestGameFrom(owner(), calm);
    const back = await left.restart({ awayMs: 10 * HOUR_MS });
    await watch(back, DOUBLE);
    await back.game.dispatch({ id: 'seen', command: { type: 'AcknowledgeReturnSummary' } });
    expect(stateOf(back).adRewards.offlineDouble).toEqual({ status: 'none' });
    const again = await back.restart({ awayMs: 10 * HOUR_MS });
    expect(offerOf(again, DOUBLE)).toMatchObject({ status: 'ready' });
  });
});

describe('rush day (#165)', () => {
  it('doubles one business for the rest of today and the next business day', async () => {
    const session = await startTestGameFrom(owner(), calm);
    await watch(session, RUSH);
    expect(vending(session)?.rushDay).toEqual({ status: 'active', endsDay: 2, profitBps: 20000 });
    expect(
      selectRushDay(session.game.getSnapshot(), { businessId: 'vending', content: getContent() }),
    ).toEqual({
      status: 'running',
      multiplier: 2,
      daysLeft: 2,
    });
    session.clock.advance(MINUTE_MS);
    await session.game.checkpoint();
    expect<bigint>(cash(session)).toBe(dollars('10'));
    expect(offerOf(session, RUSH)).toEqual({ status: 'hidden' });
  });

  it('ends at the start of the business day after next', async () => {
    const session = await startTestGameFrom(
      owner({ rushDay: { status: 'active', endsDay: 1, profitBps: 20000 } }),
      calm,
    );
    session.clock.advance(10 * MINUTE_MS);
    await session.game.checkpoint();
    expect(vending(session)?.rushDay).toEqual({ status: 'none' });
    expect<bigint>(cash(session)).toBe(dollars('100'));
    session.clock.advance(MINUTE_MS);
    await session.game.checkpoint();
    expect<bigint>(cash(session)).toBe(dollars('105'));
  });

  it('never doubles a loss and allows three a day', () => {
    const economy = adRewardEconomy(getContent());
    const used = { ...FRESH.adRewards, dayKey: 'day-0', used: { rush_day: 3 } };
    expect(applyClaimAdReward(owner({}, { adRewards: used }), { offer: RUSH, economy })).toEqual({
      ok: false,
      error: 'AD_REWARD_LIMIT',
    });
    expect(applyClaimAdReward(owner({ status: 'closed' }), { offer: RUSH, economy })).toEqual({
      ok: false,
      error: 'BUSINESS_CLOSED',
    });
  });
});

describe('daily briefcase (#165)', () => {
  it('pays fifteen minutes of current income once a day', async () => {
    const session = await startTestGameFrom(owner(), calm);
    expect(selectBriefcaseCents(session.game.getSnapshot(), getContent())).toBe(dollars('75'));
    expect(offerOf(session, BRIEFCASE)).toEqual({ status: 'ready', daily: { left: 1, limit: 1 } });
    await watch(session, BRIEFCASE);
    expect<bigint>(cash(session)).toBe(dollars('75'));
    expect(offerOf(session, BRIEFCASE)).toEqual({ status: 'used_up', limit: 1 });
    await watch(session, BRIEFCASE);
    expect(session.ads.shows()).toBe(1);
    const tomorrow = await session.restart({ awayMs: DAY_MS });
    expect(offerOf(tomorrow, BRIEFCASE)).toMatchObject({ status: 'ready', daily: { left: 1 } });
  });

  it('is not offered to a player with no income', async () => {
    const session = await startTestGameFrom(FRESH);
    expect(offerOf(session, BRIEFCASE)).toEqual({ status: 'hidden' });
  });

  it('is taxed as income', async () => {
    const filer = taxReturnOwner();
    const taxed = {
      ...filer,
      businesses: [ownedBusiness('vending')],
      tax: { ...filer.tax, basis: { 'business:vending': dollars('250') } },
    };
    const session = await startTestGameFrom(taxed, calm);
    await watch(session, BRIEFCASE);
    expect(stateOf(session).tax).toMatchObject({
      pools: { ad_rewards: { grossCents: dollars('75'), profitCents: dollars('75') } },
    });
  });
});

describe('incidents, takeover locks and auction lots (#165)', () => {
  it('ends an active incident, twice a day at most', async () => {
    const incident = {
      status: 'active',
      incidentId: 'vending_breakdown',
      endsDay: 5,
      capacityBps: 7000,
      costBps: 10000,
    } as const;
    const session = await startTestGameFrom(owner({ incident }), calm);
    const offer: AdOffer = { kind: 'end_incident', businessId: 'vending' };
    expect(offerOf(session, offer)).toEqual({ status: 'ready', daily: { left: 2, limit: 2 } });
    await watch(session, offer);
    expect(vending(session)?.incident).toEqual({ status: 'none' });
    expect(stateOf(session).adRewards.used).toEqual({ end_incident: 1 });
    expect(offerOf(session, offer)).toEqual({ status: 'hidden' });
  });

  it('clears the lock on a rival that turned an offer down', async () => {
    const takeovers = {
      offer: { status: 'none' },
      locks: [{ rivalId: 'snackpoint', untilDay: 5 }],
      merged: [],
    } as const;
    const session = await startTestGameFrom(owner({ takeovers }), calm);
    await watch(session, {
      kind: 'clear_takeover_lock',
      businessId: 'vending',
      rivalId: 'snackpoint',
    });
    expect(vending(session)?.takeovers.locks).toEqual([]);
    expect(stateOf(session).adRewards.used).toEqual({ clear_takeover_lock: 1 });
  });

  it('redraws the auction lots twice a day and keeps the redraw across a restart', async () => {
    const session = await startTestGameFrom(FRESH);
    const first = lotIds(session);
    await watch(session, REDRAW);
    const second = lotIds(session);
    expect(second).toHaveLength(first.length);
    expect(second).not.toEqual(first);
    await watch(session, REDRAW);
    expect(lotIds(session)).not.toEqual(second);
    expect(offerOf(session, REDRAW)).toEqual({ status: 'used_up', limit: 2 });
    const restarted = await session.restart();
    expect(lotIds(restarted)).toEqual(lotIds(session));
    expect(stateOf(restarted).adRewards).toEqual(stateOf(session).adRewards);
  });
});
