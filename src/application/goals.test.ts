import type { CommandEnvelope, GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars, units } from '@/domain/money';

import type { Game, GameEvent } from './game';
import { encodeSave } from './saveFormat';
import { startTestGameFromDocument, startTestGameFrom, type TestGame } from './testGame';

const HOUR_MS = 3_600_000;

function startWith(overrides: Partial<GameState> = {}): Promise<TestGame> {
  return startTestGameFrom({
    ...freshGameState({ saveId: 'goals', economyVersion: 1, wallMs: 0 }),
    ...overrides,
  });
}

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
    expect(completedGoals(game)).toEqual(PEAK_GOALS);
  });

  it('awards badges only, with no cash', async () => {
    const { game } = await startWith({ cashCents: dollars('1,000,000,000') });
    const outcome = await game.checkpoint();
    expect(outcome).toEqual({ ok: true, revision: 1, cashChangeCents: dollars('0') });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('1,000,000,000'));
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

describe('saves from before goals', () => {
  const vending = {
    definitionId: 'vending',
    levels: { capacity: 0, quality: 0, efficiency: 0 },
    managerOwned: false,
    capitalizedSpendCents: dollars('250'),
  };

  function schemaV4Save(): string {
    const fresh = freshGameState({ saveId: 'older', economyVersion: 1, wallMs: 0 });
    const { goals: _goals, activity: _activity, ...rest } = fresh;
    return encodeSave({ ...rest, schemaVersion: 4, businesses: [vending] } as unknown as GameState);
  }

  it('migrate from schema 4 with an empty history, then catch up on goals already earned', async () => {
    const { game } = await startTestGameFromDocument(schemaV4Save(), 0);
    expect(game.getSnapshot().state).toMatchObject({
      schemaVersion: 6,
      goals: { completed: [], pinnedGoalId: null },
      activity: { open: null, lifetime: { entries: 0 } },
    });
    await game.checkpoint();
    expect(completedGoals(game)).toEqual(['first_business']);
    expect(await game.readActivity()).toEqual([]);
  });
});
