import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import { simulateBalance } from './balance/simulation';
import { PURCHASE_CATALOGUE } from './purchaseCatalogue';
import { ownership, purchasePolicy } from './purchaseTesting';
import { selectReturnSummary } from './returnSummaryView';
import { scriptedBilling } from './scriptedBilling';
import { selectStore } from './storeView';
import { selectTapCard } from './tapCardView';
import { startTestGameFrom, withoutIncidents, type TestGame } from './testGame';

const HOUR_MS = 3_600_000;
const START_MS = 1_800_000_000_000;

const content = withoutIncidents(getContent());

const FRESH = freshGameState({
  saveId: 'purchase-effects',
  economyVersion: CURRENT_ECONOMY_VERSION,
  wallMs: START_MS,
});

const vendingOwner: GameState = { ...FRESH, businesses: [ownedBusiness('vending')] };

const policy = {
  scopes: purchasePolicy.scopes,
  products: PURCHASE_CATALOGUE.map((product) => ({
    ...product,
    productClass: 'nonConsumable' as const,
  })),
};

const bought = (productId: string) => ({
  ...ownership,
  reference: { ...ownership.reference, productId, purchaseId: `transaction-${productId}` },
});

const wallet = bought('pm_golden_wallet');
const manager = bought('pm_night_manager');

const inventory = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: START_MS,
  removals: [],
} as const;

const stateOf = (session: TestGame) => session.game.getSnapshot().state;
const cash = (session: TestGame) => stateOf(session).cashCents;
const tapCard = (session: TestGame) => selectTapCard(session.game.getSnapshot(), content);
const summary = (session: TestGame) => selectReturnSummary(stateOf(session), content);

async function tapTimes(session: TestGame, taps: number): Promise<bigint> {
  const before = cash(session);
  Array.from({ length: taps }).forEach(() => session.game.tap());
  await session.game.flushTaps();
  return cash(session) - before;
}

async function awayFor(session: TestGame, awayMs: number): Promise<bigint> {
  const before = cash(session);
  await session.game.pause();
  session.clock.advance(awayMs);
  await session.game.resume();
  return cash(session) - before;
}

const owning = (state: GameState, entitlements: GameState['entitlements']) =>
  startTestGameFrom({ ...state, entitlements }, { content });

function restoring(
  state: GameState,
  product: { readonly bought: typeof wallet; readonly removedAfterMs: number },
): Promise<TestGame> {
  const removed = {
    ...inventory,
    observedAtMs: START_MS + product.removedAfterMs,
    ownership: [],
    removals: [product.bought.reference],
  };
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [{ ...inventory, ownership: [product.bought] }, removed],
  });
  return startTestGameFrom(state, { content, billing, purchasePolicy: policy });
}

describe('Golden wallet (#153)', () => {
  it('is sold in the Store', () => {
    expect(PURCHASE_CATALOGUE).toContainEqual({
      productId: 'pm_golden_wallet',
      entitlements: ['goldenWallet'],
    });
    const rows = selectStore(
      { ...FRESH, entitlements: { goldenWallet: ['purchase-1'] } },
      {
        catalogue: PURCHASE_CATALOGUE,
        front: {
          shelf: { status: 'loading' },
          activity: { status: 'idle' },
          notice: { about: 'nothing' },
        },
      },
    );
    expect(rows).toMatchObject([{ name: 'Golden wallet', offer: { status: 'owned' } }]);
  });

  it('pays the plain payout and shows the standard wallet without it', async () => {
    const session = await owning(FRESH, {});
    expect(tapCard(session)).toMatchObject({ perTapCents: dollars('1'), skin: 'standard' });
    expect(await tapTimes(session, 3)).toBe(dollars('3'));
  });

  it('doubles every tap and turns the wallet gold', async () => {
    const session = await owning(FRESH, { goldenWallet: ['purchase-1'] });
    expect(tapCard(session)).toMatchObject({ perTapCents: dollars('2'), skin: 'golden' });
    session.game.tap();
    expect<bigint>(tapCard(session).cashCents).toBe(dollars('2'));
    expect(await tapTimes(session, 2)).toBe(dollars('6'));
  });

  it('stacks with Tap Boost', async () => {
    const session = await owning(FRESH, {
      goldenWallet: ['purchase-1'],
      vipPass: ['purchase-2'],
      removeAds: ['purchase-2'],
    });
    await session.game.pressTapBoost();
    await session.game.flushTaps();
    expect(tapCard(session)).toMatchObject({ perTapCents: dollars('10'), boosted: true });
    expect(await tapTimes(session, 3)).toBe(dollars('30'));
  });

  it('stops doubling from the next tap when revoked, and takes nothing back', async () => {
    const session = await restoring(FRESH, { bought: wallet, removedAfterMs: 0 });
    await session.game.purchases.restore();
    expect(await tapTimes(session, 3)).toBe(dollars('6'));
    await session.game.purchases.restore();
    expect(stateOf(session).entitlements).toEqual({});
    expect<bigint>(cash(session)).toBe(dollars('6'));
    expect(tapCard(session)).toMatchObject({ perTapCents: dollars('1'), skin: 'standard' });
    expect(await tapTimes(session, 3)).toBe(dollars('3'));
  });
});

describe('Night manager (#153)', () => {
  it('is sold in the Store', () => {
    expect(PURCHASE_CATALOGUE).toContainEqual({
      productId: 'pm_night_manager',
      entitlements: ['nightManager'],
    });
  });

  it('credits eight hours of a longer absence without it', async () => {
    const session = await owning(vendingOwner, {});
    expect(await awayFor(session, 30 * HOUR_MS)).toBe(dollars('2400'));
    expect(summary(session)).toMatchObject({
      creditedLabel: '8h',
      capLabel: '8h',
      capReached: true,
    });
  });

  it('credits up to twenty-four hours of an absence', async () => {
    const session = await owning(vendingOwner, { nightManager: ['purchase-1'] });
    expect(await awayFor(session, 30 * HOUR_MS)).toBe(dollars('7200'));
    expect(summary(session)).toMatchObject({
      creditedLabel: '24h',
      capLabel: '24h',
      capReached: true,
    });
  });

  it('goes back to eight hours from the next absence when revoked', async () => {
    const session = await restoring(vendingOwner, {
      bought: manager,
      removedAfterMs: 30 * HOUR_MS,
    });
    await session.game.purchases.restore();
    expect(await awayFor(session, 30 * HOUR_MS)).toBe(dollars('7200'));
    await session.game.purchases.restore();
    expect(stateOf(session).entitlements).toEqual({});
    expect<bigint>(cash(session)).toBe(dollars('7200'));
    expect(await awayFor(session, 30 * HOUR_MS)).toBe(dollars('2400'));
  });
});

describe('the balance run that owns both (#153)', () => {
  const scenario = {
    name: 'Both owned',
    seed: 'balance-test',
    policy: 'saveForNextBusiness' as const,
    tapsPerSecond: 2,
    stepMs: 1000,
    sessions: [
      { activeMs: 125_000, awayMs: 30 * HOUR_MS },
      { activeMs: 1000, awayMs: 0 },
    ],
    maxActiveMs: 126_000,
    stopAtPeakCents: dollars('1,000,000,000'),
    goalRewards: 'unclaimed' as const,
  };
  const owned = { goldenWallet: ['balance'], nightManager: ['balance'] };

  it('taps twice as fast to the first business and earns three times the absence', () => {
    const plain = simulateBalance(scenario, content);
    const both = simulateBalance({ ...scenario, entitlements: owned }, content);
    expect(plain.goals['first_business']?.activeMs).toBe(125_000);
    expect(both.goals['first_business']?.activeMs).toBe(63_000);
    expect(both.final.worth.netWorthCents > plain.final.worth.netWorthCents).toBe(true);
  });
});
