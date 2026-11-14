import { getContent } from '@/content';
import type { AdOffer } from '@/domain/adRewards';
import type { GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import { adOfferText, selectAdOffer } from './adOfferView';
import { awayFor, breakAfterIdle, startAdSession, type AdSession } from './automaticAdsTesting';
import { PURCHASE_CATALOGUE } from './purchaseCatalogue';
import { selectTapBoost } from './tapBoostView';
import { withoutIncidents } from './testGame';

const LONG_AWAY_MS = 31 * 60_000;
const BRIEFCASE: AdOffer = { kind: 'briefcase' };

const calm = withoutIncidents(getContent());

async function ownerOf(entitlements: GameState['entitlements']): Promise<AdSession> {
  const plain = await startAdSession({ content: calm });
  const state = {
    ...plain.game.getSnapshot().state,
    businesses: [ownedBusiness('vending')],
    cashCents: dollars('0'),
    entitlements,
  };
  return startAdSession({ state, content: calm });
}

const stateOf = (session: AdSession) => session.game.getSnapshot().state;
const briefcase = (session: AdSession) =>
  selectAdOffer(session.game.getSnapshot(), { content: calm, offer: BRIEFCASE });

async function thirdSessionAway(session: AdSession): Promise<void> {
  await awayFor(session, LONG_AWAY_MS);
  await awayFor(session, LONG_AWAY_MS);
}

describe('Remove ads (#152)', () => {
  it('is sold with the VIP pass, which includes it', () => {
    expect(PURCHASE_CATALOGUE).toEqual(
      expect.arrayContaining([
        { productId: 'pm_remove_ads', entitlements: ['removeAds'] },
        { productId: 'pm_vip_pass', entitlements: ['vipPass', 'removeAds'] },
      ]),
    );
  });

  it('shows the automatic ads to a player who owns neither', async () => {
    const session = await ownerOf({});
    await breakAfterIdle(session);
    await thirdSessionAway(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(1);
    expect(session.ads.automatic.appOpen.shows()).toBe(1);
  });

  it('never loads or shows an interstitial, an Ad break card or an app open ad', async () => {
    const session = await ownerOf({ removeAds: ['purchase-1'] });
    const pending = session.game.naturalBreak('left_home');
    expect(session.game.getSnapshot().automaticAd).toBe('none');
    await pending;
    await thirdSessionAway(session);
    expect(session.ads.automatic.interstitial.loads()).toBe(0);
    expect(session.ads.automatic.appOpen.loads()).toBe(0);
    expect(session.ads.automatic.interstitial.shows()).toBe(0);
    expect(session.ads.automatic.appOpen.shows()).toBe(0);
  });

  it('keeps rewarded ads opt-in: the reward still takes a watched ad', async () => {
    const session = await ownerOf({ removeAds: ['purchase-1'] });
    expect(briefcase(session)).toMatchObject({ status: 'ready' });
    const before = stateOf(session).cashCents;
    await session.game.watchAd(BRIEFCASE);
    await session.game.flushTaps();
    expect(session.ads.shows()).toBe(1);
    expect<bigint>(stateOf(session).cashCents - before).toBe(dollars('75'));
  });
});

describe('VIP pass (#152)', () => {
  const vip = { vipPass: ['purchase-1'], removeAds: ['purchase-1'] };

  it('never loads an ad of any kind', async () => {
    const session = await ownerOf(vip);
    await breakAfterIdle(session);
    await thirdSessionAway(session);
    expect(session.ads.loads()).toBe(0);
    expect(session.ads.automatic.interstitial.loads()).toBe(0);
    expect(session.ads.automatic.appOpen.loads()).toBe(0);
  });

  it('starts Tap Boost at a press, with no ad', async () => {
    const session = await ownerOf(vip);
    expect(selectTapBoost(session.game.getSnapshot(), calm)).toEqual({
      status: 'ready',
      cost: 'free',
      multiplier: 5,
      durationSeconds: 60,
    });
    await session.game.pressTapBoost();
    await session.game.flushTaps();
    expect(session.ads.shows()).toBe(0);
    expect(stateOf(session).reward.boost.status).toBe('active');
    expect(selectTapBoost(session.game.getSnapshot(), calm)).toMatchObject({ status: 'active' });
  });

  it('claims an ad reward at a press and keeps its daily limit', async () => {
    const session = await ownerOf(vip);
    expect(adOfferText({ status: 'free', daily: { left: 1, limit: 1 } }, '$75')).toEqual({
      buttonLabel: 'Claim · $75',
      note: '1 of 1 left today',
      enabled: true,
    });
    expect(briefcase(session)).toEqual({ status: 'free', daily: { left: 1, limit: 1 } });
    const before = stateOf(session).cashCents;
    await session.game.watchAd(BRIEFCASE);
    await session.game.flushTaps();
    expect<bigint>(stateOf(session).cashCents - before).toBe(dollars('75'));
    expect(briefcase(session)).toEqual({ status: 'used_up', limit: 1 });
    await session.game.watchAd(BRIEFCASE);
    await session.game.flushTaps();
    expect<bigint>(stateOf(session).cashCents - before).toBe(dollars('75'));
    expect(session.ads.shows()).toBe(0);
  });
});
