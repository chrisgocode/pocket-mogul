import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import type { CommandEnvelope, GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars, units } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import type { Game, GameEvent } from './game';
import { selectGoals } from './goalsView';
import { selectRank } from './rankView';
import { startTestGameFrom, type TestGame } from './testGame';

const HOUR_MS = 3_600_000;

function startWith(overrides: Partial<GameState> = {}): Promise<TestGame> {
  return startTestGameFrom({
    ...freshGameState({ saveId: 'goals', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    ...overrides,
  });
}

const FRESH = freshGameState({
  saveId: 'goals',
  economyVersion: CURRENT_ECONOMY_VERSION,
  wallMs: 0,
});

const withVending = (stage: number): GameState => ({
  ...FRESH,
  businesses: [ownedBusiness('vending', { stage })],
});

const at = (peak: string) =>
  selectRank({ ...FRESH, peakNetWorthCents: dollars(peak) }, getContent());

const run = (game: Game, command: GameCommand) =>
  game.dispatch({ id: game.createCommandId(), command });

const buy = (game: Game, assetId: string) =>
  run(game, {
    type: 'ExecuteTrade',
    assetId,
    side: 'buy',
    quantity: units('10'),
    quotedTick: game.getSnapshot().state.market.tick,
  });

const completedGoals = (game: Game) =>
  game.getSnapshot().state.goals.completed.map((goal) => goal.goalId);

const PEAK_GOALS = [
  'peak_1k',
  'peak_10k',
  'peak_100k',
  'peak_1m',
  'peak_10m',
  'peak_100m',
  'peak_1b',
];

describe('first-action goals', () => {
  it('completes the first wallet upgrade goal when the wallet is upgraded', async () => {
    const { game } = await startWith({ cashCents: dollars('100') });
    expect(completedGoals(game)).toEqual([]);
    await run(game, { type: 'UpgradeWallet', fromLevel: 0 });
    expect(completedGoals(game)).toEqual(['first_wallet_upgrade']);
  });

  it('completes the first business goal on the first purchase', async () => {
    const { game } = await startWith({ cashCents: dollars('250') });
    await run(game, { type: 'BuyBusiness', businessId: 'vending' });
    expect(completedGoals(game)).toEqual(['first_business']);
  });

  it('completes the first rental goal when a property is rented, not when it is bought', async () => {
    const { game } = await startWith({ cashCents: dollars('20,000') });
    await run(game, { type: 'BuyProperty', propertyId: 'studio' });
    expect(completedGoals(game)).not.toContain('first_rental');
    await run(game, { type: 'SetRentalStatus', propertyId: 'studio', rented: true });
    expect(completedGoals(game)).toContain('first_rental');
  });

  it('tells stock purchases and crypto purchases apart', async () => {
    const { game } = await startWith({ cashCents: dollars('500'), tradingUnlocked: true });
    await buy(game, 'prism');
    expect(completedGoals(game)).toEqual(['first_stock']);
    await buy(game, 'wag');
    expect(completedGoals(game)).toEqual(['first_stock', 'first_crypto']);
  });

  it('completes the first dividend goal at the first payout', async () => {
    const session = await startWith({ cashCents: dollars('500'), tradingUnlocked: true });
    await buy(session.game, 'prism');
    session.clock.advance(HOUR_MS);
    await session.game.checkpoint();
    expect(completedGoals(session.game)).toEqual(['first_stock', 'first_dividend']);
  });
});

describe('wealth goals', () => {
  it('completes $1K when peak net worth reaches it', async () => {
    const { game } = await startWith({ cashCents: dollars('999') });
    await run(game, { type: 'TapBatch', taps: 1 });
    expect(completedGoals(game)).toEqual(['peak_1k']);
  });

  it('completes every wealth goal from $1K to $1B in order', async () => {
    const { game } = await startWith({ cashCents: dollars('1,000,000,000') });
    await game.checkpoint();
    expect(completedGoals(game)).toEqual([
      ...PEAK_GOALS,
      'every_tier',
      'rich_list_top_15',
      'rich_list_top_10',
      'rich_list_top_5',
    ]);
  });

  it('pays nothing until the reward is claimed', async () => {
    const { game } = await startWith({ cashCents: dollars('1,000,000,000') });
    const outcome = await game.checkpoint();
    expect(outcome).toEqual({ ok: true, revision: 1, cashChangeCents: dollars('0') });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('1,000,000,000'));
    expect(game.getSnapshot().state.claimedGoals).toEqual([]);
  });

  it('keeps a goal once wealth falls', async () => {
    const { game } = await startWith({ cashCents: dollars('1,000') });
    await game.checkpoint();
    await run(game, { type: 'BuyBusiness', businessId: 'vending' });
    expect(completedGoals(game)).toEqual(['peak_1k', 'first_business']);
  });
});

describe('pinned goal', () => {
  it('pins one goal at a time', async () => {
    const { game } = await startWith();
    await run(game, { type: 'PinGoal', goalId: 'first_business' });
    await run(game, { type: 'PinGoal', goalId: 'peak_10k' });
    expect(game.getSnapshot().state.goals.pinnedGoalId).toBe('peak_10k');
  });

  it('unpins the goal once it is reached', async () => {
    const { game } = await startWith({ cashCents: dollars('250') });
    await run(game, { type: 'PinGoal', goalId: 'first_business' });
    await run(game, { type: 'BuyBusiness', businessId: 'vending' });
    expect(game.getSnapshot().state.goals.pinnedGoalId).toBeNull();
  });

  it('refuses to pin a reached or unknown goal', async () => {
    const { game } = await startWith({ cashCents: dollars('1,000') });
    await game.checkpoint();
    expect(await run(game, { type: 'PinGoal', goalId: 'peak_1k' })).toEqual({
      ok: false,
      error: 'GOAL_COMPLETED',
    });
    expect(await run(game, { type: 'PinGoal', goalId: 'peak_2k' })).toEqual({
      ok: false,
      error: 'UNKNOWN_GOAL',
    });
  });
});

describe('goal completion event', () => {
  it('raises one event per commit with every goal it completed', async () => {
    const { game } = await startWith({ cashCents: dollars('9,999') });
    const events: GameEvent[] = [];
    game.subscribeEvents((event) => events.push(event));
    await run(game, { type: 'TapBatch', taps: 1 });
    await run(game, { type: 'TapBatch', taps: 1 });
    expect(events).toEqual([{ type: 'goalsCompleted', goalIds: ['peak_1k', 'peak_10k'] }]);
  });

  it('does not raise it again when a command is replayed', async () => {
    const { game } = await startWith({ cashCents: dollars('250') });
    const events: GameEvent[] = [];
    game.subscribeEvents((event) => events.push(event));
    const envelope: CommandEnvelope = {
      id: 'buy-once',
      command: { type: 'BuyBusiness', businessId: 'vending' },
    };
    await game.dispatch(envelope);
    await game.dispatch(envelope);
    expect(events).toHaveLength(1);
  });
});

describe('goal rewards (UX03)', () => {
  it('pays each reward once, when claimed', async () => {
    const { game } = await startWith({ cashCents: dollars('1,000') });
    await game.checkpoint();
    const claim = { type: 'ClaimGoals', goalIds: ['peak_1k'] } as const;
    expect(await run(game, claim)).toMatchObject({ ok: true, cashChangeCents: dollars('50') });
    expect(game.getSnapshot().state).toMatchObject({
      cashCents: dollars('1,050'),
      claimedGoals: ['peak_1k'],
    });
    expect(await run(game, claim)).toEqual({ ok: false, error: 'GOAL_NOT_CLAIMABLE' });
  });

  it('claims several rewards at once and refuses goals that are not reached', async () => {
    const { game } = await startWith({ cashCents: dollars('1,000') });
    await run(game, { type: 'BuyBusiness', businessId: 'vending' });
    const goalIds = ['peak_1k', 'first_business'];
    expect(await run(game, { type: 'ClaimGoals', goalIds: [...goalIds, 'peak_10k'] })).toEqual({
      ok: false,
      error: 'GOAL_NOT_CLAIMABLE',
    });
    expect(await run(game, { type: 'ClaimGoals', goalIds })).toMatchObject({
      cashChangeCents: dollars('100'),
    });
    expect(await run(game, { type: 'ClaimGoals', goalIds: ['nope'] })).toEqual({
      ok: false,
      error: 'UNKNOWN_GOAL',
    });
  });

  it('lets a goal reached before rewards existed be claimed once', async () => {
    const { game } = await startWith({
      goals: { completed: [{ goalId: 'first_business', simulationMs: 0 }], pinnedGoalId: null },
    });
    const view = selectGoals(game.getSnapshot().state, getContent());
    expect(view).toMatchObject({ claimableIds: ['first_business'], claimableCents: dollars('50') });
    await run(game, { type: 'ClaimGoals', goalIds: view.claimableIds });
    expect(selectGoals(game.getSnapshot().state, getContent())).toMatchObject({
      reachedCount: 1,
      claimableIds: [],
      claimableCents: dollars('0'),
    });
  });
});

describe('stage and milestone goals (UX03)', () => {
  it('reaches a business goal at Local and shows where the business stands', async () => {
    const state = withVending(1);
    const open = selectGoals(state, getContent()).goals.find((goal) => goal.id === 'vending_local');
    expect(open).toMatchObject({
      status: 'open',
      title: 'Pick your locations',
      rewardCents: dollars('25'),
      progressLabel: 'Grow the Vending Machine to Local · now Startup',
    });
    const { game } = await startWith(withVending(2));
    await game.checkpoint();
    expect(completedGoals(game)).toContain('vending_local');
    expect(completedGoals(game)).not.toContain('vending_global');
  });

  it('counts milestones from the save', async () => {
    const { game } = await startWith({ tap: { walletLevel: 10, totalAcceptedTaps: 999 } });
    await game.checkpoint();
    expect(completedGoals(game)).toEqual(['first_wallet_upgrade', 'wallet_10']);
    const taps = selectGoals(game.getSnapshot().state, getContent()).goals.find(
      (goal) => goal.id === 'taps_1k',
    );
    expect(taps).toMatchObject({ progressLabel: 'Taps 999 of 1,000' });
  });
});

describe('rank (UX03)', () => {
  it('names the rank for peak net worth and the next one', () => {
    expect(at('0')).toEqual({
      title: 'Hustler',
      next: { title: 'Operator', thresholdCents: dollars('10,000') },
    });
    expect(at('999,999.99')?.title).toBe('Entrepreneur');
    expect(at('1,000,000')?.title).toBe('Millionaire');
    expect(at('5,000,000,000')).toEqual({ title: 'Mogul', next: undefined });
  });
});
